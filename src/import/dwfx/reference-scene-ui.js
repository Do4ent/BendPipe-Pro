(() => {
  const runtimes=new Map();
  const templates=new Map();
  let selected=null;

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

  function buildAssetTemplate(runtime,asset,THREE){
    const key=String(runtime.scene_id)+"|"+String(asset.id);
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
          transparent:true,
          opacity:.42,
          depthWrite:true,
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
          transparent:true,
          opacity:.62
        });
        const lines=new THREE.LineSegments(geometry,material);
        lines.userData.referenceShared=true;
        lines.userData.referenceGeometry=true;
        group.add(lines);
      }
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
    sceneGroup.scale.setScalar(
      (Number(sceneMeta?.scale_mm_per_source_unit)||Number(runtime.scale_mm_per_source_unit)||1)*
      Number(geomScale||1)
    );

    const hidden=hiddenSet(sceneMeta);
    const editable=editablePartSet(project);

    const visit=(node,parentHidden=false)=>{
      const nodeHidden=parentHidden||hidden.has(String(node.id))||node.visible===false;
      if(nodeHidden)return;

      const recognizedPart=String(node.editable_part_number??"");
      const suppressEditable=
        recognizedPart&&editable.has(recognizedPart);

      if(!suppressEditable){
        for(const instance of node.geometry_instances??[]){
          if(instance?.status!=="exact")continue;
          const asset=runtime.assetsById.get(String(instance.asset_id));
          if(!asset||asset.status!=="exact")continue;
          const template=buildAssetTemplate(runtime,asset,THREE);
          const placed=template.clone(true);
          placed.userData.referenceShared=true;
          placed.userData.referenceGeometry=true;
          placed.userData.referenceNodeId=String(node.id);
          placed.userData.referenceSceneId=String(sceneMeta.id);
          if(Array.isArray(instance.placement_matrix)&&instance.placement_matrix.length===16){
            placed.matrix.fromArray(instance.placement_matrix);
            placed.matrixAutoUpdate=false;
          }
          sceneGroup.add(placed);
        }
      }

      for(const child of node.children??[])visit(child,nodeHidden);
    };

    for(const root of sceneMeta?.tree??[])visit(root,false);
    parent.add(sceneGroup);
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

  function treeItems({project,query="",escape=escHtml}){
    const rows=[];
    const q=String(query??"").trim().toLowerCase();
    for(const scene of project?.referenceScenes??[]){
      if(!scene)continue;
      const collapsedScenes=new Set(
        Array.isArray(scene.collapsedNodeIds)
          ? scene.collapsedNodeIds.map(String)
          : []
      );
      const hidden=hiddenSet(scene);
      const sceneLabel=String(scene.name??scene.source_file??"DWFx");
      if(q&&!sceneLabel.toLowerCase().includes(q)&&!(scene.tree??[]).some((node)=>matchNode(node,q))){
        continue;
      }

      rows.push(
        '<div class="tb-tree-node level1 tb-ref-scene" data-ref-scene-row="'+escape(scene.id)+'">'+
        '<span class="tb-tree-icon">▾</span>'+
        '<span class="tb-tree-label">📦 '+escape(sceneLabel)+' <small>· DWFx · только чтение</small></span>'+
        '<button class="tb-tree-eye" data-ref-scene-eye="'+escape(scene.id)+'" title="Видимость импортированной геометрии">'+
        (scene.visible===false?'○':'◉')+
        '</button></div>'
      );

      const append=(node,depth)=>{
        if(q&&!matchNode(node,q))return;
        const hasChildren=(node.children??[]).length>0;
        const collapsed=collapsedScenes.has(String(node.id));
        const isHidden=hidden.has(String(node.id));
        const status=String(node.geometry_status??"");
        const editable=!!node.editable_part_number;
        const icon=hasChildren
          ? (collapsed?'▸':'▾')
          : editable
            ? '⌁'
            : status==="unresolved"||status==="partial"
              ? '⚠'
              : '◆';
        const pad=Math.min(220,16+depth*18);
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
          '<button class="tb-tree-icon" '+(hasChildren?'data-ref-toggle="'+escape(node.id)+'"':'disabled')+'>'+
          icon+'</button>'+
          '<span class="tb-tree-label">'+escape(node.label??node.id)+
          (editable?' <small>· редактируемая труба</small>':'')+
          '</span>'+
          '<button class="tb-tree-eye" data-ref-eye="'+escape(node.id)+'" title="Видимость">'+
          (isHidden?'○':'◉')+
          '</button></div>'
        );
        if(hasChildren&&!collapsed){
          for(const child of node.children??[])append(child,depth+1);
        }
      };
      for(const root of scene.tree??[])append(root,2);
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

  function bindTree(host,project,{switchTube,save,renderAll,refreshProjectTree}={}){
    if(!host||!project)return;

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
        if(event.target.closest("button"))return;
        const scene=findScene(project,row.dataset.refScene);
        const node=findNode(scene?.tree,row.dataset.refNode);
        if(!scene||!node)return;

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
        refreshProjectTree?.();
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
    restorePersistedRuntimes,
    runtimeSummary
  });
})();
