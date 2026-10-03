(() => {
  const runtimes=new Map();
  const templates=new Map();
  let selected=null;
  const bulkSelected=new Set();
  let rangeAnchorKey=null;

  const escHtml=(value)=>String(value??"").replace(/[&<>"']/g,(ch)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  function runtimeKey(scene){
    return String(scene?.runtime_scene_id??scene?.id??"");
  }

  function registerRuntime(runtime){
    if(!runtime||typeof runtime!=="object")return false;
    const key=String(runtime.scene_id??"");
    if(!key||!Array.isArray(runtime.assets))return false;
    const assetsById=new Map(
      runtime.assets.map((asset)=>[String(asset?.id??""),asset])
    );
    runtimes.set(key,{...runtime,assetsById});
    for(const cacheKey of [...templates.keys()]){
      if(cacheKey.startsWith(key+"|"))templates.delete(cacheKey);
    }
    return true;
  }

  function rgbHex(rgb,fallback=0x8f9baa){
    if(!Array.isArray(rgb)||rgb.length<3)return fallback;
    const c=rgb.slice(0,3).map((x)=>Math.max(0,Math.min(255,Number(x)||0)));
    return (c[0]<<16)|(c[1]<<8)|c[2];
  }

  function buildAssetTemplate(runtime,asset,THREE,displayMode="normal"){
    const transparent=displayMode==="transparent";
    const key=String(runtime.scene_id)+"|"+String(asset.id)+"|"+displayMode;
    if(templates.has(key))return templates.get(key);

    const group=new THREE.Group();
    group.userData.referenceShared=true;
    group.userData.referenceAssetId=asset.id;

    if(asset.kind==="mesh"){
      for(const item of asset.meshes??[]){
        const vertices=item.vertices??[];
        const faces=item.faces??[];
        if(!vertices.length||!faces.length)continue;

        const positions=new Float32Array(vertices.length*3);
        for(let i=0;i<vertices.length;i+=1){
          positions[i*3]=Number(vertices[i]?.[0])||0;
          positions[i*3+1]=Number(vertices[i]?.[1])||0;
          positions[i*3+2]=Number(vertices[i]?.[2])||0;
        }
        const indices=new Uint32Array(faces.length*3);
        for(let i=0;i<faces.length;i+=1){
          indices[i*3]=Number(faces[i]?.[0])||0;
          indices[i*3+1]=Number(faces[i]?.[1])||0;
          indices[i*3+2]=Number(faces[i]?.[2])||0;
        }

        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
        geometry.setIndex(new THREE.BufferAttribute(indices,1));
        geometry.computeVertexNormals();

        const material=new THREE.MeshStandardMaterial({
          color:rgbHex(item.color_rgb),
          roughness:.7,
          metalness:.04,
          transparent,
          opacity:transparent ? .24 : 1,
          depthWrite:!transparent,
          side:THREE.DoubleSide
        });
        const mesh=new THREE.Mesh(geometry,material);
        mesh.userData.referenceShared=true;
        mesh.userData.referenceGeometry=true;
        if(Array.isArray(item.matrix)&&item.matrix.length===16){
          mesh.matrix.fromArray(item.matrix);
          mesh.matrixAutoUpdate=false;
        }
        group.add(mesh);
      }
    }else if(asset.kind==="line_segments"){
      const source=asset.line_segments?.positions??[];
      if(source.length>=6){
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(Float32Array.from(source),3)
        );
        const material=new THREE.LineBasicMaterial({
          color:rgbHex(asset.line_segments?.color_rgb,0x8795a8),
          transparent,
          opacity:transparent ? .28 : 1
        });
        const lines=new THREE.LineSegments(geometry,material);
        lines.userData.referenceShared=true;
        lines.userData.referenceGeometry=true;
        group.add(lines);
      }
    }

    for(const instance of asset.nested_instances??[]){
      if(instance?.status!=="exact")continue;
      const child=runtime.assetsById.get(String(instance.asset_id));
      if(!child||child.status!=="exact")continue;
      const childTemplate=buildAssetTemplate(runtime,child,THREE,displayMode);
      const placed=childTemplate.clone(true);
      placed.userData.referenceShared=true;
      placed.userData.referenceGeometry=true;
      if(Array.isArray(instance.placement_matrix)&&instance.placement_matrix.length===16){
        placed.matrix.fromArray(instance.placement_matrix);
        placed.matrixAutoUpdate=false;
      }
      group.add(placed);
    }

    templates.set(key,group);
    return group;
  }

  function hiddenSet(scene){
    return new Set(
      Array.isArray(scene?.hiddenNodeIds)
        ? scene.hiddenNodeIds.map(String)
        : []
    );
  }

  function transparentSet(scene){
    return new Set(
      Array.isArray(scene?.transparentNodeIds)
        ? scene.transparentNodeIds.map(String)
        : []
    );
  }

  function editablePartSet(project){
    return new Set(
      (project?.tubes??[])
        .flatMap((tube)=>[
          tube?.partNumber,
          tube?.part_number,
          tube?.importEvidence?.part_number,
          tube?.currentProjectImport?.part_number
        ])
        .filter((value)=>value!=null&&String(value)!=="")
        .map(String)
    );
  }

  function nodeTranslationMm(node){
    const value=node?.translation_mm;
    const source=Array.isArray(value)
      ? {x:value[0],y:value[1],z:value[2]}
      : value&&typeof value==="object"
        ? value
        : {};
    const out={
      x:Number(source.x)||0,
      y:Number(source.y)||0,
      z:Number(source.z)||0
    };
    return out;
  }

  function addTranslationMm(a,b){
    return {
      x:(Number(a?.x)||0)+(Number(b?.x)||0),
      y:(Number(a?.y)||0)+(Number(b?.y)||0),
      z:(Number(a?.z)||0)+(Number(b?.z)||0)
    };
  }

  function selectedKeySet(){
    return new Set(bulkSelected);
  }

  const FRAME_IDENTITY=Object.freeze([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
  ]);

  function frameMatrix16(value){
    if(!Array.isArray(value)||value.length!==16)return FRAME_IDENTITY;
    const out=value.map(Number);
    return out.every(Number.isFinite)?out:FRAME_IDENTITY;
  }

  function frameMultiply4(a,b){
    const left=frameMatrix16(a),right=frameMatrix16(b);
    const out=new Array(16).fill(0);
    for(let col=0;col<4;col+=1){
      for(let row=0;row<4;row+=1){
        let sum=0;
        for(let k=0;k<4;k+=1){
          sum+=left[k*4+row]*right[col*4+k];
        }
        out[col*4+row]=sum;
      }
    }
    return out;
  }

  function frameTransformPoint(point,matrix){
    if(!Array.isArray(point)||point.length<3)return null;
    const x=Number(point[0]),y=Number(point[1]),z=Number(point[2]);
    if(![x,y,z].every(Number.isFinite))return null;
    const m=frameMatrix16(matrix);
    const w=m[3]*x+m[7]*y+m[11]*z+m[15];
    const denom=Number.isFinite(w)&&Math.abs(w)>1e-12?w:1;
    return [
      (m[0]*x+m[4]*y+m[8]*z+m[12])/denom,
      (m[1]*x+m[5]*y+m[9]*z+m[13])/denom,
      (m[2]*x+m[6]*y+m[10]*z+m[14])/denom
    ];
  }

  function runtimeForScene(scene){
    let runtime=runtimes.get(runtimeKey(scene));
    if(!runtime&&scene?.display_runtime){
      registerRuntime(scene.display_runtime);
      runtime=runtimes.get(runtimeKey(scene));
    }
    return runtime??null;
  }

  function emptyFrameBounds(){
    return {
      min:[Infinity,Infinity,Infinity],
      max:[-Infinity,-Infinity,-Infinity],
      point_count:0
    };
  }

  function expandFrameBounds(bounds,pointMm){
    if(!Array.isArray(pointMm)||pointMm.length<3)return;
    const point=pointMm.slice(0,3).map(Number);
    if(!point.every(Number.isFinite))return;
    for(let axis=0;axis<3;axis+=1){
      bounds.min[axis]=Math.min(bounds.min[axis],point[axis]);
      bounds.max[axis]=Math.max(bounds.max[axis],point[axis]);
    }
    bounds.point_count+=1;
  }

  function appendAssetBounds({
    runtime,
    assetId,
    matrix,
    translationMm,
    scaleMm,
    bounds,
    stack=new Set()
  }){
    const key=String(assetId??"");
    if(!key||stack.has(key))return;
    const asset=runtime?.assetsById?.get(key);
    if(!asset||asset.status!=="exact")return;
    const nextStack=new Set(stack);
    nextStack.add(key);

    const appendPoint=(point,transform)=>{
      const source=frameTransformPoint(point,transform);
      if(!source)return;
      expandFrameBounds(bounds,[
        source[0]*scaleMm+translationMm.x,
        source[1]*scaleMm+translationMm.y,
        source[2]*scaleMm+translationMm.z
      ]);
    };

    for(const mesh of asset.meshes??[]){
      const meshMatrix=frameMultiply4(matrix,mesh?.matrix);
      for(const vertex of mesh?.vertices??[])appendPoint(vertex,meshMatrix);
    }

    const positions=asset.line_segments?.positions??[];
    for(let index=0;index+2<positions.length;index+=3){
      appendPoint(
        [positions[index],positions[index+1],positions[index+2]],
        matrix
      );
    }

    for(const nested of asset.nested_instances??[]){
      if(nested?.status!=="exact")continue;
      appendAssetBounds({
        runtime,
        assetId:nested.asset_id,
        matrix:frameMultiply4(matrix,nested.placement_matrix),
        translationMm,
        scaleMm,
        bounds,
        stack:nextStack
      });
    }
  }

  function currentReferenceProjectBounds(project){
    const bounds=emptyFrameBounds();
    for(const scene of project?.referenceScenes??[]){
      const runtime=runtimeForScene(scene);
      if(!runtime){
        return Object.freeze({
          status:"unresolved",
          reason:"Reference-scene runtime is unavailable.",
          point_count:bounds.point_count
        });
      }
      const scaleMm=Number(scene?.scale_mm_per_source_unit)||
        Number(runtime?.scale_mm_per_source_unit)||1;
      if(!Number.isFinite(scaleMm)||scaleMm<=0){
        return Object.freeze({
          status:"unresolved",
          reason:"Reference-scene scale is invalid.",
          point_count:bounds.point_count
        });
      }

      const visit=(node,parentTranslation={x:0,y:0,z:0})=>{
        const translation=addTranslationMm(parentTranslation,nodeTranslationMm(node));
        for(const instance of node?.geometry_instances??[]){
          if(instance?.status!=="exact")continue;
          appendAssetBounds({
            runtime,
            assetId:instance.asset_id,
            matrix:frameMatrix16(instance.placement_matrix),
            translationMm:translation,
            scaleMm,
            bounds
          });
        }
        for(const child of node?.children??[])visit(child,translation);
      };
      for(const root of scene?.tree??[])visit(root);
    }

    if(bounds.point_count===0){
      return Object.freeze({
        status:"empty",
        point_count:0,
        min:null,
        max:null,
        size:null
      });
    }
    const size=bounds.max.map((value,index)=>value-bounds.min[index]);
    return Object.freeze({
      status:"exact",
      point_count:bounds.point_count,
      min:Object.freeze([...bounds.min]),
      max:Object.freeze([...bounds.max]),
      size:Object.freeze(size)
    });
  }

  function automaticFrameFromCurrentBounds(bounds){
    if(bounds?.status!=="exact")return Object.freeze({
      status:bounds?.status??"unresolved",
      reason:bounds?.reason??"Reference bounds are unavailable."
    });
    const min=bounds.min.map(Math.floor);
    const max=bounds.max.map(Math.ceil);
    const size=max.map((value,index)=>value-min[index]);
    if(!size.every((value)=>Number.isFinite(value)&&value>0)){
      return Object.freeze({
        status:"unresolved",
        reason:"Remaining imported geometry does not define a positive 3D frame."
      });
    }
    return Object.freeze({
      status:"exact",
      bbox:Object.freeze({x:size[0],y:size[1],z:size[2]}),
      bboxAnchor:Object.freeze({x:0,y:0,z:0}),
      coordinateOffset:Object.freeze({x:min[0],y:min[1],z:min[2]}),
      exactBoundsMm:Object.freeze({
        min:Object.freeze([...bounds.min]),
        max:Object.freeze([...bounds.max]),
        size:Object.freeze([...bounds.size])
      }),
      frameBoundsMm:Object.freeze({
        min:Object.freeze([...min]),
        max:Object.freeze([...max]),
        size:Object.freeze([...size])
      }),
      roundingRule:"floor_min_ceil_max_mm"
    });
  }

  function renderSceneTree({
    parent,
    sceneMeta,
    runtime,
    project,
    THREE,
    geomScale
  }){
    if(sceneMeta?.visible===false)return;
    const sceneGroup=new THREE.Group();
    sceneGroup.name="DWFx reference: "+String(sceneMeta?.source_file??sceneMeta?.name??"");
    sceneGroup.userData.referenceGeometry=true;
    sceneGroup.userData.referenceSceneId=sceneMeta.id;
    const scaleMm=Number(sceneMeta?.scale_mm_per_source_unit)||
      Number(runtime.scale_mm_per_source_unit)||1;
    sceneGroup.scale.setScalar(scaleMm*Number(geomScale||1));

    const hidden=hiddenSet(sceneMeta);
    const transparent=transparentSet(sceneMeta);
    const editable=editablePartSet(project);
    const selectedKeys=selectedKeySet();
    const selectedGroups=[];

    const visit=(
      node,
      parentHidden=false,
      parentTransparent=false,
      parentTranslation={x:0,y:0,z:0}
    )=>{
      const nodeHidden=parentHidden||hidden.has(String(node.id))||node.visible===false;
      if(nodeHidden)return;
      const nodeTransparent=parentTransparent||transparent.has(String(node.id));
      const translation=addTranslationMm(parentTranslation,nodeTranslationMm(node));

      const recognizedPart=String(node.editable_part_number??"");
      const suppressEditable=
        recognizedPart&&editable.has(recognizedPart);

      if(!suppressEditable){
        const nodeGroup=new THREE.Group();
        nodeGroup.userData.referenceShared=true;
        nodeGroup.userData.referenceGeometry=true;
        nodeGroup.userData.referenceNodeId=String(node.id);
        nodeGroup.userData.referenceSceneId=String(sceneMeta.id);
        nodeGroup.position.set(
          translation.x/scaleMm,
          translation.y/scaleMm,
          translation.z/scaleMm
        );
        let instanceCount=0;
        for(const instance of node.geometry_instances??[]){
          if(instance?.status!=="exact")continue;
          const asset=runtime.assetsById.get(String(instance.asset_id));
          if(!asset||asset.status!=="exact")continue;
          const template=buildAssetTemplate(
            runtime,
            asset,
            THREE,
            nodeTransparent?"transparent":"normal"
          );
          const placed=template.clone(true);
          placed.userData.referenceShared=true;
          placed.userData.referenceGeometry=true;
          placed.userData.referenceNodeId=String(node.id);
          placed.userData.referenceSceneId=String(sceneMeta.id);
          if(Array.isArray(instance.placement_matrix)&&instance.placement_matrix.length===16){
            placed.matrix.fromArray(instance.placement_matrix);
            placed.matrixAutoUpdate=false;
          }
          nodeGroup.add(placed);
          instanceCount+=1;
        }
        if(instanceCount){
          sceneGroup.add(nodeGroup);
          if(selectedKeys.has(selectionKey(sceneMeta.id,node.id))){
            selectedGroups.push(nodeGroup);
          }
        }
      }

      for(const child of node.children??[]){
        visit(child,nodeHidden,nodeTransparent,translation);
      }
    };

    for(const root of sceneMeta?.tree??[]){
      visit(root,false,false,{x:0,y:0,z:0});
    }
    parent.add(sceneGroup);

    if(selectedGroups.length){
      sceneGroup.updateMatrixWorld(true);
      for(const group of selectedGroups){
        const box=new THREE.Box3().setFromObject(group);
        if(box.isEmpty())continue;
        const helper=new THREE.Box3Helper(box,0x4da3ff);
        helper.userData.helper=true;
        helper.userData.referenceSelectionHelper=true;
        parent.add(helper);
      }
    }
  }

  function render3D({parent,project,THREE,geomScale}){
    if(!parent||!project||!THREE)return 0;
    let count=0;
    for(const sceneMeta of project.referenceScenes??[]){
      let runtime=runtimes.get(runtimeKey(sceneMeta));
      if(!runtime&&sceneMeta?.display_runtime){
        registerRuntime(sceneMeta.display_runtime);
        runtime=runtimes.get(runtimeKey(sceneMeta));
      }
      if(!runtime)continue;
      renderSceneTree({parent,sceneMeta,runtime,project,THREE,geomScale});
      count+=1;
    }
    return count;
  }

  function matchNode(node,query){
    if(!query)return true;
    if(String(node?.label??"").toLowerCase().includes(query))return true;
    return (node?.children??[]).some((child)=>matchNode(child,query));
  }

  function selectionKey(sceneId,nodeId){
    return String(sceneId)+"|"+String(nodeId);
  }

  function selectableNode(node){
    return !!node && !node.editable_part_number;
  }

  function collectSelectableNodes(nodes,out=[]){
    for(const node of nodes??[]){
      if(selectableNode(node))out.push(node);
      collectSelectableNodes(node?.children,out);
    }
    return out;
  }

  function collectSelectableSubtree(node,out=[]){
    if(!node)return out;
    if(selectableNode(node))out.push(node);
    for(const child of node.children??[])collectSelectableSubtree(child,out);
    return out;
  }

  function selectedEntries(project){
    const entries=[];
    for(const scene of project?.referenceScenes??[]){
      const byId=new Map();
      const stack=[...(scene?.tree??[])];
      while(stack.length){
        const node=stack.shift();
        byId.set(String(node.id),node);
        stack.unshift(...(node.children??[]));
      }
      for(const key of bulkSelected){
        const prefix=String(scene.id)+"|";
        if(!key.startsWith(prefix))continue;
        const node=byId.get(key.slice(prefix.length));
        if(node&&selectableNode(node))entries.push({scene,node});
      }
    }
    return entries;
  }

  function pruneBulkSelection(project){
    const valid=new Set(
      selectedEntries(project).map(({scene,node})=>selectionKey(scene.id,node.id))
    );
    for(const key of [...bulkSelected]){
      if(!valid.has(key))bulkSelected.delete(key);
    }
  }

  function selectedCount(project){
    pruneBulkSelection(project);
    return bulkSelected.size;
  }

  function treeItems({project,query="",escape=escHtml}){
    const rows=[];
    const q=String(query??"").trim().toLowerCase();
    const scenes=(project?.referenceScenes??[]).filter(Boolean);
    if(!scenes.length)return rows;

    pruneBulkSelection(project);
    const bulkCount=bulkSelected.size;
    const rootCollapsed=q?false:project?.referenceGeometryTreeCollapsed===true;
    const allSelectable=scenes.flatMap((scene)=>collectSelectableNodes(scene.tree??[]));
    const allSelectedCount=scenes.reduce((sum,scene)=>
      sum+collectSelectableNodes(scene.tree??[]).filter((node)=>
        bulkSelected.has(selectionKey(scene.id,node.id))
      ).length
    ,0);
    const rootChecked=allSelectable.length>0&&allSelectedCount===allSelectable.length;
    const rootIndeterminate=allSelectedCount>0&&!rootChecked;

    rows.push(
      '<div class="tb-tree-node level1 tb-ref-root" data-ref-root-row="1">'+
      '<input type="checkbox" data-ref-root-select="1" '+
      (rootChecked?'checked ':'')+
      'data-ref-indeterminate="'+(rootIndeterminate?'1':'0')+'" title="Выбрать всю импортированную readonly-геометрию">'+
      '<button class="tb-tree-icon" data-ref-root-toggle="1" title="Свернуть/развернуть импортированную геометрию">'+
      (rootCollapsed?'▸':'▾')+
      '</button>'+
      '<span class="tb-tree-label">🌐 Импортированная геометрия <small>· файлов: '+scenes.length+'</small></span>'+
      '</div>'
    );

    if(rootCollapsed)return rows;

    rows.push(
      '<div class="tb-tree-node tb-ref-bulk-toolbar" data-ref-bulk-toolbar="1" '+
      'style="gap:6px;align-items:center;flex-wrap:wrap;padding:6px 8px 6px 34px">'+
      '<span class="tb-tree-label" style="min-width:86px">Выбрано: '+bulkCount+'</span>'+
      '<small title="Групповой выбор: Ctrl+клик; диапазон: Shift+клик">Ctrl+клик · Shift+клик</small>'+
      '<button data-ref-bulk-action="show" '+(bulkCount?'':'disabled')+' title="Показать выбранные">Показать</button>'+
      '<button data-ref-bulk-action="hide" '+(bulkCount?'':'disabled')+' title="Скрыть выбранные">Скрыть</button>'+
      '<button data-ref-bulk-action="transparent" '+(bulkCount?'':'disabled')+' title="Переключить прозрачность">Прозрачность</button>'+
      '<button data-ref-bulk-action="delete" '+(bulkCount?'':'disabled')+' title="Удалить выбранную reference-геометрию">Удалить</button>'+
      '<button data-ref-bulk-action="clear" '+(bulkCount?'':'disabled')+' title="Снять выбор">Снять выбор</button>'+
      '</div>'
    );

    for(const scene of scenes){
      const collapsedScenes=new Set(
        Array.isArray(scene.collapsedNodeIds)
          ? scene.collapsedNodeIds.map(String)
          : []
      );
      const hidden=hiddenSet(scene);
      const transparent=transparentSet(scene);
      const sceneSelectable=collectSelectableNodes(scene.tree??[]);
      const sceneSelectedCount=sceneSelectable.filter((node)=>
        bulkSelected.has(selectionKey(scene.id,node.id))
      ).length;
      const sceneChecked=sceneSelectable.length>0&&sceneSelectedCount===sceneSelectable.length;
      const sceneIndeterminate=sceneSelectedCount>0&&!sceneChecked;
      const sceneLabel=String(scene.name??scene.source_file??"DWFx");
      const sceneMatches=
        !q||
        sceneLabel.toLowerCase().includes(q)||
        (scene.tree??[]).some((node)=>matchNode(node,q));
      if(!sceneMatches)continue;

      const sceneCollapsed=q?false:scene.treeCollapsed===true;
      rows.push(
        '<div class="tb-tree-node tb-ref-scene" style="padding-left:34px" data-ref-scene-row="'+escape(scene.id)+'">'+
        '<input type="checkbox" data-ref-scene-select="'+escape(scene.id)+'" '+
        (sceneChecked?'checked ':'')+
        'data-ref-indeterminate="'+(sceneIndeterminate?'1':'0')+'" title="Выбрать все readonly-компоненты файла">'+
        '<button class="tb-tree-icon" data-ref-scene-toggle="'+escape(scene.id)+'" title="Свернуть/развернуть файл">'+
        (sceneCollapsed?'▸':'▾')+
        '</button>'+
        '<span class="tb-tree-label">📦 '+escape(sceneLabel)+' <small>· DWFx · только чтение</small></span>'+
        '<button class="tb-tree-eye" data-ref-scene-eye="'+escape(scene.id)+'" title="Видимость импортированной геометрии">'+
        (scene.visible===false?'○':'◉')+
        '</button></div>'
      );

      if(sceneCollapsed)continue;

      const append=(node,depth)=>{
        if(q&&!matchNode(node,q))return;
        const hasChildren=(node.children??[]).length>0;
        const collapsed=q?false:collapsedScenes.has(String(node.id));
        const isHidden=hidden.has(String(node.id));
        const isTransparent=transparent.has(String(node.id));
        const status=String(node.geometry_status??"");
        const editable=!!node.editable_part_number;
        const selectable=!editable;
        const checked=selectable&&bulkSelected.has(selectionKey(scene.id,node.id));
        const icon=hasChildren
          ? (collapsed?'▸':'▾')
          : editable
            ? '⌁'
            : status==="unresolved"||status==="partial"
              ? '⚠'
              : status==="metadata_only"
                ? '◇'
                : '◆';
        const pad=Math.min(240,52+depth*18);
        const cls=
          selected?.sceneId===String(scene.id)&&
          selected?.nodeId===String(node.id)
            ? " active"
            : "";
        rows.push(
          '<div class="tb-tree-node clickable tb-ref-node'+cls+'" '+
          'style="padding-left:'+pad+'px" '+
          'data-ref-scene="'+escape(scene.id)+'" data-ref-node="'+escape(node.id)+'" '+
          (node.editable_part_number?'data-ref-editable-part="'+escape(node.editable_part_number)+'" ':'')+
          '>'+
          (selectable
            ? '<input type="checkbox" data-ref-select="'+escape(node.id)+'" '+(checked?'checked ':'')+'title="Выбрать компонент/группу">'
            : '<span style="width:13px;display:inline-block"></span>')+
          '<button class="tb-tree-icon" '+(hasChildren?'data-ref-toggle="'+escape(node.id)+'"':'disabled')+'>'+
          icon+'</button>'+
          '<span class="tb-tree-label">'+escape(node.label??node.id)+
          (editable
            ? ' <small>· редактируемая труба</small>'
            : status==="metadata_only"
              ? ' <small>· без геометрии</small>'
              : ' <small>· только чтение'+(isTransparent?' · прозрачно':'')+'</small>')+
          '</span>'+
          '<button class="tb-tree-eye" data-ref-eye="'+escape(node.id)+'" title="Видимость">'+
          (isHidden?'○':'◉')+
          '</button></div>'
        );
        if(hasChildren&&!collapsed){
          for(const child of node.children??[])append(child,depth+1);
        }
      };
      for(const root of scene.tree??[])append(root,0);
    }
    return rows;
  }

  function findScene(project,id){
    return (project?.referenceScenes??[]).find(
      (scene)=>String(scene?.id)===String(id)
    )??null;
  }

  function findNode(tree,id){
    const target=String(id);
    const stack=[...(tree??[])];
    while(stack.length){
      const node=stack.shift();
      if(String(node?.id)===target)return node;
      stack.unshift(...(node?.children??[]));
    }
    return null;
  }

  function ancestorsFor(tree,targetId){
    const target=String(targetId);
    const path=[];
    const walk=(nodes)=>{
      for(const node of nodes??[]){
        path.push(String(node.id));
        if(String(node.id)===target)return true;
        if(walk(node.children))return true;
        path.pop();
      }
      return false;
    };
    walk(tree??[]);
    return path;
  }

  function toggleSceneSelection(scene,checked){
    for(const node of collectSelectableNodes(scene?.tree??[])){
      const key=selectionKey(scene.id,node.id);
      if(checked)bulkSelected.add(key);else bulkSelected.delete(key);
    }
  }

  function toggleNodeSelection(scene,node,checked){
    for(const item of collectSelectableSubtree(node)){
      const key=selectionKey(scene.id,item.id);
      if(checked)bulkSelected.add(key);else bulkSelected.delete(key);
    }
  }

  function applyBulkVisibility(project,visible){
    for(const {scene,node} of selectedEntries(project)){
      const hidden=hiddenSet(scene);
      if(visible){
        hidden.delete(String(node.id));
        for(const ancestorId of ancestorsFor(scene.tree,node.id))hidden.delete(String(ancestorId));
      }else{
        hidden.add(String(node.id));
      }
      scene.hiddenNodeIds=[...hidden];
    }
  }

  function isolateSelection(project){
    const selectedTop=selectedTopLevelEntries(project);
    const selectedByScene=new Map();
    for(const {scene,node} of selectedTop){
      const key=String(scene.id);
      const list=selectedByScene.get(key)??[];
      list.push(node);
      selectedByScene.set(key,list);
    }

    for(const scene of project?.referenceScenes??[]){
      const chosen=selectedByScene.get(String(scene.id))??[];
      if(!chosen.length){
        scene.visible=false;
        continue;
      }

      scene.visible=true;
      const keep=new Set();
      for(const selectedNode of chosen){
        for(const id of ancestorsFor(scene.tree,selectedNode.id))keep.add(String(id));
        for(const item of collectSelectableSubtree(selectedNode))keep.add(String(item.id));

        // A selected group may contain metadata/editable descendants that are not
        // bulk-selectable but are still required to preserve the complete subtree.
        const stack=[...(selectedNode.children??[])];
        while(stack.length){
          const child=stack.shift();
          keep.add(String(child.id));
          stack.unshift(...(child.children??[]));
        }
      }

      const hidden=new Set();
      const stack=[...(scene.tree??[])];
      while(stack.length){
        const node=stack.shift();
        if(!keep.has(String(node.id)))hidden.add(String(node.id));
        stack.unshift(...(node.children??[]));
      }
      scene.hiddenNodeIds=[...hidden];
    }
    return selectedTop.length;
  }

  function showAll(project){
    let changed=0;
    for(const scene of project?.referenceScenes??[]){
      if(scene?.visible===false)changed+=1;
      if(Array.isArray(scene?.hiddenNodeIds)&&scene.hiddenNodeIds.length)changed+=scene.hiddenNodeIds.length;
      scene.visible=true;
      scene.hiddenNodeIds=[];
    }
    return changed;
  }

  function applyBulkTransparency(project){
    const entries=selectedEntries(project);
    if(!entries.length)return;
    const allTransparent=entries.every(({scene,node})=>
      transparentSet(scene).has(String(node.id))
    );
    const byScene=new Map();
    for(const {scene,node} of entries){
      const key=String(scene.id);
      const set=byScene.get(key)??transparentSet(scene);
      if(allTransparent)set.delete(String(node.id));
      else set.add(String(node.id));
      byScene.set(key,set);
    }
    for(const scene of project.referenceScenes??[]){
      const set=byScene.get(String(scene.id));
      if(set)scene.transparentNodeIds=[...set];
    }
  }

  function subtreeHasEditable(node){
    if(node?.editable_part_number)return true;
    return (node?.children??[]).some(subtreeHasEditable);
  }

  function deleteSelectedFromTree(scene,nodes){
    const removeIds=new Set(
      selectedEntries({referenceScenes:[scene]}).map(({node})=>String(node.id))
    );
    const prune=(node)=>{
      const selectedForDelete=removeIds.has(String(node.id))&&selectableNode(node);
      if(selectedForDelete&&!subtreeHasEditable(node))return null;
      const children=(node.children??[]).map(prune).filter(Boolean);
      if(selectedForDelete){
        return {
          ...node,
          geometry_instances:[],
          geometry_status:children.length?"group":"metadata_only",
          children
        };
      }
      return {...node,children};
    };
    return (nodes??[]).map(prune).filter(Boolean);
  }

  function previewDeleteFrame(project){
    const selectedNow=selectedEntries(project);
    if(!selectedNow.length){
      return Object.freeze({
        status:"no_selection",
        frame:null,
        selected_count:0
      });
    }
    const affected=new Set(selectedNow.map(({scene})=>String(scene.id)));
    const scenes=[];
    for(const source of project?.referenceScenes??[]){
      const scene=JSON.parse(JSON.stringify(source));
      if(affected.has(String(scene.id))){
        scene.tree=deleteSelectedFromTree(scene,scene.tree);
      }
      if(Array.isArray(scene.tree)&&scene.tree.length)scenes.push(scene);
    }
    const bounds=currentReferenceProjectBounds({referenceScenes:scenes});
    const frame=automaticFrameFromCurrentBounds(bounds);
    return Object.freeze({
      status:frame.status,
      frame:frame.status==="exact"?frame:null,
      bounds,
      selected_count:selectedNow.length,
      reason:frame.status==="exact"?null:frame.reason??bounds.reason??null
    });
  }

  function applyBulkDelete(project){
    const affected=new Set(
      selectedEntries(project).map(({scene})=>String(scene.id))
    );
    for(const scene of project.referenceScenes??[]){
      if(!affected.has(String(scene.id)))continue;
      scene.tree=deleteSelectedFromTree(scene,scene.tree);
    }
    const kept=[];
    for(const scene of project.referenceScenes??[]){
      if(Array.isArray(scene.tree)&&scene.tree.length>0){
        kept.push(scene);
        continue;
      }
      const runtimeId=runtimeKey(scene);
      runtimes.delete(runtimeId);
      for(const key of [...templates.keys()]){
        if(key.startsWith(runtimeId+"|"))templates.delete(key);
      }
    }
    project.referenceScenes=kept;
    bulkSelected.clear();
  }

  function selectScene(project,sceneId,checked=true){
    const scene=findScene(project,sceneId);
    if(!scene)return 0;
    toggleSceneSelection(scene,checked);
    return selectedCount(project);
  }

  function selectNode(project,sceneId,nodeId,checked=true){
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node||!selectableNode(node))return selectedCount(project);
    toggleNodeSelection(scene,node,checked);
    return selectedCount(project);
  }

  function clearSelection(){
    bulkSelected.clear();
    rangeAnchorKey=null;
    selected=null;
    return 0;
  }

  function sceneNodeFromKey(project,key){
    const text=String(key??"");
    const split=text.indexOf("|");
    if(split<0)return null;
    const sceneId=text.slice(0,split);
    const nodeId=text.slice(split+1);
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    return scene&&node?{scene,node}:null;
  }

  function visibleSelectionKeys(host){
    return [...host.querySelectorAll("[data-ref-node]")]
      .filter((row)=>!row.dataset.refEditablePart)
      .map((row)=>selectionKey(row.dataset.refScene,row.dataset.refNode));
  }

  function applyModifierSelection(
    project,
    orderedKeys,
    targetKey,
    {ctrlKey=false,metaKey=false,shiftKey=false}={}
  ){
    const additive=!!(ctrlKey||metaKey);
    const target=sceneNodeFromKey(project,targetKey);
    if(!target||!selectableNode(target.node))return selectedCount(project);

    if(shiftKey){
      const keys=Array.isArray(orderedKeys)?orderedKeys.map(String):[];
      const targetIndex=keys.indexOf(String(targetKey));
      let anchorIndex=keys.indexOf(String(rangeAnchorKey??""));
      if(targetIndex<0)return selectedCount(project);
      if(anchorIndex<0){
        anchorIndex=targetIndex;
        rangeAnchorKey=String(targetKey);
      }
      if(!additive)bulkSelected.clear();
      const from=Math.min(anchorIndex,targetIndex);
      const to=Math.max(anchorIndex,targetIndex);
      for(let index=from;index<=to;index+=1){
        const entry=sceneNodeFromKey(project,keys[index]);
        if(entry&&selectableNode(entry.node)){
          toggleNodeSelection(entry.scene,entry.node,true);
        }
      }
      return selectedCount(project);
    }

    if(additive){
      const key=selectionKey(target.scene.id,target.node.id);
      toggleNodeSelection(
        target.scene,
        target.node,
        !bulkSelected.has(key)
      );
      rangeAnchorKey=key;
      return selectedCount(project);
    }

    rangeAnchorKey=selectionKey(target.scene.id,target.node.id);
    return selectedCount(project);
  }

  function selectedKeys(project){
    pruneBulkSelection(project);
    return Object.freeze([...bulkSelected]);
  }

  function replaceSelection(project,keys=[]){
    bulkSelected.clear();
    let active=null;
    for(const key of keys??[]){
      const entry=sceneNodeFromKey(project,key);
      if(entry&&selectableNode(entry.node)){
        const normalized=selectionKey(entry.scene.id,entry.node.id);
        bulkSelected.add(normalized);
        active={sceneId:String(entry.scene.id),nodeId:String(entry.node.id)};
      }
    }
    selected=active;
    rangeAnchorKey=active?selectionKey(active.sceneId,active.nodeId):null;
    return selectedCount(project);
  }

  function selectOnlyNode(project,sceneId,nodeId){
    bulkSelected.clear();
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node||!selectableNode(node))return 0;
    bulkSelected.add(selectionKey(scene.id,node.id));
    rangeAnchorKey=selectionKey(scene.id,node.id);
    selected={sceneId:String(scene.id),nodeId:String(node.id)};
    return selectedCount(project);
  }

  function selectedTopLevelEntries(project){
    const entries=selectedEntries(project);
    const selectedSet=new Set(
      entries.map(({scene,node})=>selectionKey(scene.id,node.id))
    );
    return entries.filter(({scene,node})=>
      !ancestorsFor(scene.tree,node.id)
        .filter((ancestorId)=>String(ancestorId)!==String(node.id))
        .some((ancestorId)=>
          selectedSet.has(selectionKey(scene.id,ancestorId))
        )
    );
  }

  function moveSelection(project,deltaMm){
    const delta={
      x:Number(deltaMm?.x)||0,
      y:Number(deltaMm?.y)||0,
      z:Number(deltaMm?.z)||0
    };
    if(!delta.x&&!delta.y&&!delta.z)return 0;
    const entries=selectedTopLevelEntries(project);
    for(const {node} of entries){
      const current=nodeTranslationMm(node);
      node.translation_mm={
        x:Number((current.x+delta.x).toFixed(6)),
        y:Number((current.y+delta.y).toFixed(6)),
        z:Number((current.z+delta.z).toFixed(6))
      };
    }
    return entries.length;
  }

  function applyBulkAction(project,action){
    const command=String(action??"");
    if(command==="clear")return clearSelection();
    if(!["show","hide","transparent","delete"].includes(command)){
      throw new RangeError("Unknown reference bulk action: "+command);
    }
    if(!bulkSelected.size)return 0;
    if(command==="show")applyBulkVisibility(project,true);
    else if(command==="hide")applyBulkVisibility(project,false);
    else if(command==="transparent")applyBulkTransparency(project);
    else if(command==="delete")applyBulkDelete(project);
    return selectedCount(project);
  }

  function revealNode(project,sceneId,nodeId){
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node)return false;
    project.referenceGeometryTreeCollapsed=false;
    scene.treeCollapsed=false;
    const collapsed=new Set(
      Array.isArray(scene.collapsedNodeIds)
        ? scene.collapsedNodeIds.map(String)
        : []
    );
    for(const ancestorId of ancestorsFor(scene.tree,node.id)){
      if(String(ancestorId)!==String(node.id))collapsed.delete(String(ancestorId));
    }
    scene.collapsedNodeIds=[...collapsed];
    selected={sceneId:String(scene.id),nodeId:String(node.id)};
    return true;
  }

  function notifyExternalSelection(source="tree"){
    queueMicrotask(()=>{
      try{
        window.TubeBenderObjectContext?.adoptReferenceSelection?.({source});
      }catch(error){
        console.warn("Reference selection synchronization:",error);
      }
    });
  }

  function bindTree(host,project,{switchTube,save,renderAll,refreshProjectTree,modelCommand}={}){
    if(!host||!project)return;

    host.querySelector("[data-ref-root-toggle]")?.addEventListener("click",(event)=>{
      event.stopPropagation();
      project.referenceGeometryTreeCollapsed=project.referenceGeometryTreeCollapsed!==true;
      save?.();
      refreshProjectTree?.();
    });

    const rootSelect=host.querySelector("[data-ref-root-select]");
    if(rootSelect){
      rootSelect.indeterminate=rootSelect.dataset.refIndeterminate==="1";
      rootSelect.addEventListener("change",(event)=>{
        event.stopPropagation();
        for(const scene of project.referenceScenes??[])toggleSceneSelection(scene,rootSelect.checked);
        const firstScene=(project.referenceScenes??[])[0]??null;
        const firstNode=firstScene?collectSelectableNodes(firstScene.tree??[])[0]??null:null;
        rangeAnchorKey=firstScene&&firstNode?selectionKey(firstScene.id,firstNode.id):null;
        selected=firstScene&&firstNode
          ? {sceneId:String(firstScene.id),nodeId:String(firstNode.id)}
          : null;
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    }

    host.querySelectorAll("[data-ref-scene-toggle]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const scene=findScene(project,button.dataset.refSceneToggle);
        if(!scene)return;
        scene.treeCollapsed=scene.treeCollapsed!==true;
        save?.();
        refreshProjectTree?.();
      });
    });

    host.querySelectorAll("[data-ref-scene-select]").forEach((input)=>{
      input.indeterminate=input.dataset.refIndeterminate==="1";
      input.addEventListener("change",(event)=>{
        event.stopPropagation();
        const scene=findScene(project,input.dataset.refSceneSelect);
        if(!scene)return;
        toggleSceneSelection(scene,input.checked);
        const first=collectSelectableNodes(scene.tree??[])[0]??null;
        rangeAnchorKey=first?selectionKey(scene.id,first.id):null;
        selected=first?{sceneId:String(scene.id),nodeId:String(first.id)}:null;
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    });

    host.querySelectorAll("[data-ref-select]").forEach((input)=>{
      input.addEventListener("change",(event)=>{
        event.stopPropagation();
        const row=input.closest("[data-ref-scene]");
        const scene=findScene(project,row?.dataset.refScene);
        const node=findNode(scene?.tree,input.dataset.refSelect);
        if(!scene||!node)return;
        toggleNodeSelection(scene,node,input.checked);
        rangeAnchorKey=selectionKey(scene.id,node.id);
        selected=input.checked
          ? {sceneId:String(scene.id),nodeId:String(node.id)}
          : selected;
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    });

    host.querySelectorAll("[data-ref-bulk-action]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const action=button.dataset.refBulkAction;
        if(action==="clear"){
          clearSelection();
          refreshProjectTree?.();
          return;
        }
        if(!bulkSelected.size)return;
        const mutate=()=>applyBulkAction(project,action);
        if(action==="delete"&&typeof modelCommand==="function"){
          modelCommand("Удалить импортированные компоненты",mutate);
        }else{
          mutate();
          save?.();
        }
        renderAll?.();
        refreshProjectTree?.();
      });
    });

    host.querySelectorAll("[data-ref-scene-eye]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const scene=findScene(project,button.dataset.refSceneEye);
        if(!scene)return;
        scene.visible=scene.visible===false;
        save?.();
        renderAll?.();
      });
    });

    host.querySelectorAll("[data-ref-toggle]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const row=button.closest("[data-ref-scene]");
        const scene=findScene(project,row?.dataset.refScene);
        if(!scene)return;
        const id=String(button.dataset.refToggle);
        const set=new Set(Array.isArray(scene.collapsedNodeIds)?scene.collapsedNodeIds.map(String):[]);
        if(set.has(id))set.delete(id);else set.add(id);
        scene.collapsedNodeIds=[...set];
        save?.();
        refreshProjectTree?.();
      });
    });

    host.querySelectorAll("[data-ref-eye]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const row=button.closest("[data-ref-scene]");
        const scene=findScene(project,row?.dataset.refScene);
        if(!scene)return;
        const id=String(button.dataset.refEye);
        const set=new Set(Array.isArray(scene.hiddenNodeIds)?scene.hiddenNodeIds.map(String):[]);
        if(set.has(id))set.delete(id);else set.add(id);
        scene.hiddenNodeIds=[...set];
        save?.();
        renderAll?.();
      });
    });

    host.querySelectorAll("[data-ref-node]").forEach((row)=>{
      row.addEventListener("click",(event)=>{
        if(event.target.closest("button,input"))return;
        const scene=findScene(project,row.dataset.refScene);
        const node=findNode(scene?.tree,row.dataset.refNode);
        if(!scene||!node)return;

        const key=selectionKey(scene.id,node.id);
        if(!node.editable_part_number&&(event.ctrlKey||event.metaKey||event.shiftKey)){
          event.preventDefault();
          applyModifierSelection(
            project,
            visibleSelectionKeys(host),
            key,
            {
              ctrlKey:event.ctrlKey,
              metaKey:event.metaKey,
              shiftKey:event.shiftKey
            }
          );
          selected={sceneId:String(scene.id),nodeId:String(node.id)};
          refreshProjectTree?.();
          notifyExternalSelection("tree");
          return;
        }

        const part=String(node.editable_part_number??"");
        if(part&&typeof switchTube==="function"){
          const tube=(project.tubes??[]).find((item)=>
            [
              item?.partNumber,
              item?.part_number,
              item?.importEvidence?.part_number,
              item?.currentProjectImport?.part_number
            ].filter(Boolean).map(String).includes(part)
          );
          if(tube){
            switchTube(tube.id);
            return;
          }
        }

        selected={sceneId:String(scene.id),nodeId:String(node.id)};
        if(!node.editable_part_number){
          bulkSelected.clear();
          bulkSelected.add(key);
          rangeAnchorKey=key;
        }
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    });
  }

  function restorePersistedRuntimes(project){
    let count=0;
    for(const scene of project?.referenceScenes??[]){
      if(scene?.display_runtime&&registerRuntime(scene.display_runtime))count+=1;
    }
    return count;
  }

  function runtimeSummary(){
    return [...runtimes.values()].map((runtime)=>({
      scene_id:runtime.scene_id,
      asset_count:runtime.assetsById.size
    }));
  }

  window.TubeBenderReferenceSceneUi=Object.freeze({
    registerRuntime,
    render3D,
    treeItems,
    bindTree,
    selectScene,
    selectNode,
    selectOnlyNode,
    selectedKeys,
    replaceSelection,
    revealNode,
    moveSelection,
    clearSelection,
    isolateSelection,
    showAll,
    currentReferenceProjectBounds,
    previewDeleteFrame,
    applyBulkAction,
    applyModifierSelection,
    selectedCount,
    restorePersistedRuntimes,
    runtimeSummary
  });
})();
