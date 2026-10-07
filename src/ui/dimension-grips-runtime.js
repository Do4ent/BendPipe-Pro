(()=>{
  const DIMENSIONS_URL="__TB_DIMENSION_GRIPS_DIMENSIONS_URL__";
  const DYNAMIC_INPUT_URL="__TB_DIMENSION_GRIPS_DYNAMIC_INPUT_URL__";
  let dimensions=null,dynamicInput=null,installed=false,root=null,activeId=null,drag=null,editor=null,hoverLabel=null,suppressUntil=0;
  const eng=()=>window.TubeBenderEngineering??null;
  const snap=()=>window.TubeBenderSnapTracking??null;
  const screenSpace=()=>window.TubeBenderScreenSpace??null;
  const interaction=()=>window.TubeBenderInteractionPriority??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const canvas=()=>document.getElementById("threeCanvas");
  const clone=v=>v==null?v:structuredClone(v);
  const scale=()=>typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const saved=()=>Array.isArray(project()?.engineering_dimensions)?project().engineering_dimensions:[];
  const dimensionById=id=>saved().find(d=>String(d?.id)===String(id))??null;
  const staleDimension=d=>String(d?.status??"")==="Stale";
  const tubeById=id=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  function finitePoint(value){
    if(!value)return null;
    const x=Number(value.x??value[0]),y=Number(value.y??value[1]),z=Number(value.z??value[2]);
    return [x,y,z].every(Number.isFinite)?{x,y,z}:null;
  }
  function sceneVectorToMm(value){
    const p=finitePoint(value);if(!p)return null;const s=scale();
    return {x:p.x/s,y:p.y/s,z:p.z/s};
  }
  function mmToScene(value){
    const p=finitePoint(value);if(!p)return null;const s=scale();
    return new THREE.Vector3(p.x*s,p.y*s,p.z*s);
  }
  function referenceStoredPoint(ref){
    return finitePoint(ref?.assembly_context?.world_point_mm)??finitePoint(ref?.evidence?.world_point_mm)??finitePoint(ref?.evidence?.point);
  }
  function rowIndexForRef(tube,ref){
    const sub=String(ref?.subentity_id??"");
    const rowIndex=(tube?.rows??[]).findIndex((row,index)=>String(row?.elementId??("row:"+index))===sub||("row:"+index)===sub);
    return rowIndex>=0?rowIndex:null;
  }
  function resolveTubeReference(ref){
    const tube=tubeById(ref?.object_id);if(!tube)return null;
    const sub=ref?.subentity_id;
    if(sub==null||sub==="")return finitePoint(tube.origin);
    let geometry;try{geometry=eng()?.geometryForTube?.(tube);}catch{return null;}
    if(!geometry)return null;
    if(String(sub)==="P1")return sceneVectorToMm(geometry.points?.[0]?.position)??finitePoint(tube.origin);
    if(String(sub)==="P2")return sceneVectorToMm(geometry.endPosition);
    const rowIndex=rowIndexForRef(tube,ref);
    const element=(geometry.elements??[]).find(el=>String(el?.id??"")===String(sub)||(rowIndex!=null&&Number(el?.rowIndex)===rowIndex));
    if(!element)return null;
    const start=sceneVectorToMm(element.start),end=sceneVectorToMm(element.end),center=sceneVectorToMm(element.center);
    const snapType=String(ref?.snap_type??"").toLowerCase(),role=String(ref?.role??"").toLowerCase();
    if(snapType.includes("center")&&center)return center;
    if(role==="start"&&start)return start;
    if(role==="end"&&end)return end;
    if(snapType.includes("endpoint"))return end??start;
    if(start&&end)return {x:(start.x+end.x)/2,y:(start.y+end.y)/2,z:(start.z+end.z)/2};
    return center??start??end;
  }
  function resolveReferencePoint(ref){
    return referenceStoredPoint(ref)??resolveTubeReference(ref);
  }
  function resolvedPoints(dimension){return (dimension?.references??[]).map(resolveReferencePoint);}
  function defaultLinePoint(points){
    const valid=points.filter(Boolean);if(!valid.length)return null;
    const sum=valid.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y,z:a.z+p.z}),{x:0,y:0,z:0});
    return {x:sum.x/valid.length,y:sum.y/valid.length,z:sum.z/valid.length};
  }
  function linePoint(dimension,points){
    return finitePoint(dimension?.leader?.line_position)??defaultLinePoint(points);
  }
  function textPoint(dimension,points){
    return finitePoint(dimension?.text_position)??linePoint(dimension,points);
  }
  function clearRoot(){if(root?.parent)root.parent.remove(root);root=null;}
  function visualScale(point){
    if(typeof camera==="undefined"||!camera||!point)return .08;
    const world=point.clone();try{pipeGroup?.localToWorld?.(world);}catch{}
    return Math.max(.02,Math.min(1.4,camera.position.distanceTo(world)*.012));
  }
  function tag(object,data={}){
    object.userData={...(object.userData??{}),helper:true,objectSelectionHelper:true,dimensionGripRuntime:true,...data};
    object.traverse?.(child=>{child.userData={...(child.userData??{}),helper:true,objectSelectionHelper:true,dimensionGripRuntime:true,...data};});
    object.renderOrder=13500;return object;
  }
  function line(a,b,color,dimensionId,kind="dimension-line"){
    const aa=mmToScene(a),bb=mmToScene(b);if(!aa||!bb)return null;
    const object=new THREE.Line(new THREE.BufferGeometry().setFromPoints([aa,bb]),new THREE.LineBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,opacity:.92}));
    return tag(object,{dimensionId,dimensionPart:kind});
  }
  function grip(point,color,dimensionId,kind,index=null){
    const p=mmToScene(point);if(!p)return null;
    const base=.07,mesh=new THREE.Mesh(new THREE.SphereGeometry(base,14,10),new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false}));
    mesh.position.copy(p);tag(mesh,{dimensionId,dimensionGrip:kind,referenceIndex:index});
    if(screenSpace()?.register)screenSpace().register(mesh,"dimension",base);else mesh.scale.setScalar(visualScale(p));
    return mesh;
  }
  function canvasTexture(text,color){
    const c=document.createElement("canvas"),ctx=c.getContext("2d"),dpr=Math.max(1,window.devicePixelRatio||1);
    ctx.font=(14*dpr)+"px Segoe UI, Arial";const width=Math.ceil(ctx.measureText(text).width+18*dpr),height=Math.ceil(28*dpr);
    c.width=width;c.height=height;ctx.font=(14*dpr)+"px Segoe UI, Arial";ctx.fillStyle="rgba(10,18,27,.88)";ctx.fillRect(0,0,width,height);ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,dpr);ctx.strokeRect(.5*dpr,.5*dpr,width-dpr,height-dpr);ctx.fillStyle=color;ctx.textBaseline="middle";ctx.fillText(text,9*dpr,height/2);
    const texture=new THREE.CanvasTexture(c);texture.needsUpdate=true;return {texture,aspect:width/height};
  }
  function dimensionLabelText(dimension){
    const value=dimensions?.formatDimensionValue?.(dimension)??String(dimension?.value??"—");
    return staleDimension(dimension)?"⚠ "+value:value;
  }
  function labelSprite(dimension,point,color){
    const p=mmToScene(point);if(!p)return null;
    const text=dimensionLabelText(dimension),made=canvasTexture(text,color);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:made.texture,transparent:true,depthTest:false,depthWrite:false}));
    sprite.position.copy(p);tag(sprite,{
      dimensionId:String(dimension.id),
      dimensionText:true,
      dimensionPart:"text",
      dimensionStatus:String(dimension?.status??""),
      staleReason:staleDimension(dimension)?String(dimension?.stale_reason??"Section-derived reference changed"):null
    });
    if(screenSpace()?.register)screenSpace().register(sprite,"dimension-text",1,{mode:"sprite",aspect:made.aspect});
    else{const s=visualScale(p);sprite.scale.set(1.8*s*made.aspect,1.8*s,1);}
    return sprite;
  }
  function renderDimension(group,dimension){
    if(dimension?.visible===false)return;
    const points=resolvedPoints(dimension),valid=points.filter(Boolean);if(!valid.length)return;
    const state=dimensions.dimensionVisualState(dimension,project()?.dimension_style??dimension.style??{}),color=Number.parseInt(String(state.color).slice(1),16);
    const linePos=linePoint(dimension,points),textPos=textPoint(dimension,points);if(!linePos||!textPos)return;
    if(valid.length>=2){
      const a=points[0],b=points[1];
      if(a){const ext=line(a,linePos,color,dimension.id,"extension-0");if(ext)group.add(ext);}
      if(b){const ext=line(b,linePos,color,dimension.id,"extension-1");if(ext)group.add(ext);}
      if(a&&b){
        const dimLine=line(
          dimension?.leader?.line_position?linePos:a,
          dimension?.leader?.line_position?{x:linePos.x+(b.x-a.x),y:linePos.y+(b.y-a.y),z:linePos.z+(b.z-a.z)}:b,
          color,dimension.id,"dimension-line"
        );if(dimLine)group.add(dimLine);
      }
    }
    if(valid.length>=3&&/angle/i.test(String(dimension.kind))){
      const center=points[1];if(center)for(const p of [points[0],points[2]]){const ray=line(center,p,color,dimension.id,"angle-ray");if(ray)group.add(ray);}
    }
    const label=labelSprite(dimension,textPos,state.color);if(label)group.add(label);
    if(String(dimension.id)===String(activeId)){
      const textGrip=grip(textPos,0xffffff,dimension.id,"text");if(textGrip)group.add(textGrip);
      const lineGrip=grip(linePos,0x65d6ff,dimension.id,"line");if(lineGrip)group.add(lineGrip);
      if(!staleDimension(dimension)){
        points.forEach((p,index)=>{if(p){const g=grip(p,0xffd65a,dimension.id,"reference",index);if(g)group.add(g);}});
      }
    }
  }
  function rebuild(){
    clearRoot();if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup||!dimensions)return false;
    const group=new THREE.Group();group.name="Engineering Dimensions";group.userData={helper:true,objectSelectionHelper:true,dimensionGripRuntime:true};
    for(const dimension of saved())renderDimension(group,dimension);
    pipeGroup.add(group);root=group;try{markViewerDirty?.();}catch{}return true;
  }
  function dimensionHoverText(dimension){
    if(!dimension)return "";
    const value=dimensionLabelText(dimension);
    const status=String(dimension?.status??"NeedsUpdate");
    const reason=staleDimension(dimension)&&dimension?.stale_reason?(" · "+String(dimension.stale_reason)):"";
    const sources=[...new Set((dimension?.references??[]).map(ref=>String(ref?.object_id??"")).filter(Boolean))];
    const auditCount=Array.isArray(dimension?.rebound_history)?dimension.rebound_history.length:0;
    const audit=window.TubeBenderMeasurements??null;
    const geometryClass=audit?.dimensionAuditGeometryClass?.(dimension)??null;
    const reviewReasons=audit?.dimensionAuditReviewReasons?.(dimension)??[];
    const fittedStats=audit?.dimensionFittedAuditStats?.(dimension)??null;
    const fittedSummary=fittedStats?[
      "Fitted refs: "+String(fittedStats.reference_count??0),
      Number.isFinite(Number(fittedStats.max_error_mm))?("max error: "+Number(fittedStats.max_error_mm).toFixed(3)+" mm"):null,
      Number.isFinite(Number(fittedStats.min_confidence))?("min confidence: "+Number(fittedStats.min_confidence).toFixed(3)):null
    ].filter(Boolean).join(" · "):null;
    const provenance=[
      geometryClass?("Geometry: "+geometryClass):null,
      reviewReasons.length?("Needs review: "+reviewReasons.join(", ")):null,
      fittedSummary,
      sources.length?("Source: "+sources.join(", ")):null,
      dimension?.rebound_from_stale===true?("Rebind audit: "+auditCount):null
    ].filter(Boolean);
    return value+" · "+status+reason+(provenance.length?" · "+provenance.join(" · "):"");
  }
  function ensureHoverLabel(){
    if(hoverLabel)return hoverLabel;
    const node=document.createElement("div");node.id="tbDimensionHover";
    node.style.cssText="position:fixed;z-index:120490;display:none;pointer-events:none;max-width:360px;padding:5px 8px;border:1px solid #52677f;border-radius:5px;background:rgba(12,20,29,.94);color:#edf4fb;font:12px Segoe UI,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35)";
    document.body.appendChild(node);hoverLabel=node;return node;
  }
  function updateHover(event){
    if(drag||editor){if(hoverLabel)hoverLabel.style.display="none";return null;}
    const picked=pick(event),dimension=dimensionById(picked?.data?.dimensionId);
    const node=ensureHoverLabel();
    if(!dimension){node.style.display="none";return null;}
    node.textContent=dimensionHoverText(dimension);
    node.style.display="block";
    node.style.left=Math.min((Number(event.clientX)||0)+12,Math.max(8,window.innerWidth-node.offsetWidth-8))+"px";
    node.style.top=Math.min((Number(event.clientY)||0)+14,Math.max(8,window.innerHeight-node.offsetHeight-8))+"px";
    return dimension;
  }
  function pick(event){
    if(!root||typeof camera==="undefined")return null;const c=canvas(),rect=c?.getBoundingClientRect?.();if(!c||!rect?.width||!rect?.height)return null;
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1),ray=new THREE.Raycaster();ray.params.Line={threshold:.12};ray.setFromCamera(mouse,camera);
    for(const hit of ray.intersectObjects(root.children,true)){
      let o=hit.object;while(o&&o!==root){
        if(o.userData?.dimensionId)return {object:o,hit,data:o.userData};
        o=o.parent;
      }
    }return null;
  }
  function pointerPlaneHit(event,anchor){
    const c=canvas(),rect=c?.getBoundingClientRect?.();if(!c||!rect?.width||!rect?.height||typeof camera==="undefined")return null;
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
    const normal=new THREE.Vector3();camera.getWorldDirection(normal);const point=mmToScene(anchor);if(!point)return null;
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,point),hit=new THREE.Vector3();return ray.ray.intersectPlane(plane,hit)?sceneVectorToMm(hit):null;
  }
  function replaceDimensionObject(id,next){
    const p=project(),index=saved().findIndex(d=>String(d?.id)===String(id));if(!p||index<0)return false;
    p.engineering_dimensions[index]=clone(next);return true;
  }
  function commit(id,label,mutator){
    const current=dimensionById(id);if(!current)return false;
    const fn=eng()?.modelCommand,run=()=>{const next=mutator(clone(current));if(!next)return false;return replaceDimensionObject(id,next);};
    let ok;try{ok=typeof fn==="function"?fn(label,run):run();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;try{eng()?.save?.();eng()?.renderAll?.();}catch{}rebuild();dispatch(id,label);return true;
  }
  function dispatch(id,reason){try{window.dispatchEvent(new CustomEvent("tubebender-dimension-change",{detail:{dimension_id:String(id??""),reason:String(reason??"change")}}));}catch{}}
  function snapReference(candidate,oldRef){
    if(!candidate?.point)throw new Error("Нет активной Snap-точки");
    const context=candidate?.metadata?.assembly_context??null;
    return {
      object_id:String(candidate.object_id??"snap"),
      subentity_id:candidate.subentity_id==null?String(candidate.id??"point"):String(candidate.subentity_id),
      snap_type:candidate.type==null?null:String(candidate.type),
      role:String(oldRef?.role??"measurement"),
      assembly_context:context?clone(context):{space:"project",assembly_id:null,assembly_path:[],local_point_mm:clone(candidate.point),world_point_mm:clone(candidate.point)},
      cross_assembly:candidate?.metadata?.cross_assembly===true,
      geometry_status:String(candidate.geometry_status??(candidate.fitted===true?"Fitted":"Exact")),
      fitting_error:clone(candidate.fitting_error??null),
      confidence:candidate.confidence==null?null:Number(candidate.confidence),
      evidence:{...(clone(candidate.evidence??candidate.metadata?.evidence??{})),world_point_mm:clone(candidate.point)}
    };
  }
  function beginDrag(event,picked){
    const data=picked?.data,dimension=dimensionById(data?.dimensionId);if(!dimension||!data?.dimensionGrip)return false;
    if(staleDimension(dimension)&&data.dimensionGrip==="reference"){
      toast("Stale Dimension: reference можно изменить только через явный Rebind");
      return false;
    }
    activeId=String(dimension.id);const points=resolvedPoints(dimension),anchor=data.dimensionGrip==="text"?textPoint(dimension,points):data.dimensionGrip==="line"?linePoint(dimension,points):points[data.referenceIndex];
    if(!anchor)return false;
    if(data.dimensionGrip==="reference")snap()?.startCommand?.("dimension-reference",{ortho:false,polar:false});
    const start=pointerPlaneHit(event,anchor);
    drag={dimensionId:String(dimension.id),kind:data.dimensionGrip,referenceIndex:data.referenceIndex,start,anchor:clone(anchor),preview:null,started:false,pointerStart:{x:event.clientX,y:event.clientY,pointerType:event.pointerType}};
    try{if(controls)controls.enabled=false;}catch{}
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function updateDrag(event){
    if(!drag)return false;
    if(!drag.started){
      const ready=interaction()?.movementExceeded?.(drag.pointerStart,event)??Math.hypot(Number(event.clientX)-Number(drag.pointerStart.x),Number(event.clientY)-Number(drag.pointerStart.y))>4;
      if(!ready){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;}
      drag.started=true;
    }
    const d=dimensionById(drag.dimensionId);if(!d)return false;
    if(drag.kind==="reference"){
      const candidate=snap()?.currentCandidate?.(),p=finitePoint(candidate?.point);
      drag.preview=p;renderReferencePreview(drag.dimensionId,drag.referenceIndex,p);return true;
    }
    const current=pointerPlaneHit(event,drag.anchor);if(!current||!drag.start)return false;
    const delta={x:current.x-drag.start.x,y:current.y-drag.start.y,z:current.z-drag.start.z};
    drag.preview={x:drag.anchor.x+delta.x,y:drag.anchor.y+delta.y,z:drag.anchor.z+delta.z};
    renderPlacementPreview(d,drag.kind,drag.preview);
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function previewNode(){return root?.getObjectByName?.("Dimension Drag Preview")??null;}
  function clearPreview(){const old=previewNode();if(old?.parent)old.parent.remove(old);}
  function renderReferencePreview(id,index,p){
    clearPreview();if(!p||!root)return;const node=grip(p,0x59e6ff,id,"preview-reference",index);if(node){node.name="Dimension Drag Preview";root.add(node);}try{markViewerDirty?.();}catch{}
  }
  function renderPlacementPreview(dimension,kind,p){
    clearPreview();if(!p||!root)return;const node=grip(p,kind==="text"?0xffffff:0x65d6ff,dimension.id,"preview-"+kind);if(node){node.name="Dimension Drag Preview";root.add(node);}try{markViewerDirty?.();}catch{}
  }
  function finishDrag(event,{cancel=false}={}){
    if(!drag)return false;const state=drag;drag=null;clearPreview();try{if(controls)controls.enabled=true;}catch{}
    const referenceCandidate=state.kind==="reference"?(snap()?.currentCandidate?.()??null):null;
    if(state.kind==="reference")snap()?.endCommand?.();
    let ok=true;if(!cancel&&state.started){
      if(state.kind==="reference"){
        if(referenceCandidate){
          ok=commit(state.dimensionId,"Переназначить Snap размера",dimension=>dimensions.replaceDimensionReference(dimension,state.referenceIndex,snapReference(referenceCandidate,dimension.references[state.referenceIndex])));
        }else{toast("Snap не выбран; reference не изменён");ok=false;}
      }else if(state.preview){
        ok=commit(state.dimensionId,state.kind==="text"?"Переместить текст размера":"Переместить размерную линию",dimension=>{
          if(state.kind==="text")return dimensions.updateDimensionRepresentation(dimension,{text_position:state.preview});
          return dimensions.updateDimensionRepresentation(dimension,{leader:{...(dimension.leader??{}),line_position:state.preview}});
        });
      }
    }
    suppressUntil=Date.now()+120;rebuild();event?.preventDefault?.();event?.stopPropagation?.();event?.stopImmediatePropagation?.();return ok;
  }
  function setDimensionVisible(id,visible){
    const dimension=dimensionById(id),p=project();if(!dimension||!p)return false;
    const run=()=>replaceDimensionObject(id,{...clone(dimension),visible:visible===true});
    const command=eng()?.modelCommand;
    let ok;try{ok=typeof command==="function"?command(visible?"Показать Dimension":"Скрыть Dimension",run):run();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    if(visible!==true){
      if(String(activeId)===String(id))activeId=null;
      try{
        const context=window.TubeBenderObjectContext;
        const kept=(context?.selectionKeys?.()??[]).filter(key=>{
          const entry=context?.parseSelectionKey?.(key);
          return entry?.kind!=="dimension"||String(entry.dimensionId)!==String(id);
        });
        context?.replaceSelectionKeys?.(kept,{announce:true});
      }catch{}
    }
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    rebuild();dispatch(id,visible?"show-dimension":"hide-dimension");return true;
  }
  function deleteDimension(id){
    const dimension=dimensionById(id),p=project();if(!dimension||!p)return false;
    const run=()=>{
      const before=saved(),next=before.filter(item=>String(item?.id)!==String(id));
      if(next.length===before.length)return false;
      p.engineering_dimensions=next.map(clone);
      try{window.TubeBenderSelectionSets?.pruneMissing?.();}catch{}
      return true;
    };
    const command=eng()?.modelCommand;
    let ok;try{ok=typeof command==="function"?command("Удалить Dimension",run):run();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    if(String(activeId)===String(id))activeId=null;
    try{
      const context=window.TubeBenderObjectContext;
      const kept=(context?.selectionKeys?.()??[]).filter(key=>context?.parseSelectionKey?.(key)?.kind!=="dimension");
      context?.replaceSelectionKeys?.(kept,{announce:true});
    }catch{}
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    rebuild();dispatch(id,"delete-dimension");toast("Dimension удалён");return true;
  }
  function syncActiveDimensionFromSelection(){
    const context=window.TubeBenderObjectContext;
    const entries=context?.selectionEntries?.()??[];
    const invalidDimensionEntries=entries.filter(entry=>{
      if(entry?.kind!=="dimension")return false;
      const dimension=dimensionById(entry.dimensionId);
      return !dimension||dimension.visible===false;
    });
    if(invalidDimensionEntries.length){
      const keys=context?.selectionKeys?.()??[];
      const kept=keys.filter(key=>{
        const entry=context?.parseSelectionKey?.(key);
        if(entry?.kind!=="dimension")return true;
        const dimension=dimensionById(entry.dimensionId);
        return !!dimension&&dimension.visible!==false;
      });
      context?.replaceSelectionKeys?.(kept,{announce:true});
      if(activeId&&!dimensionById(activeId))activeId=null;
      rebuild();return true;
    }
    const dimensionsOnly=entries.filter(entry=>entry?.kind==="dimension");
    const selectedDimension=dimensionsOnly.length===1?dimensionById(dimensionsOnly[0].dimensionId):null;
    const next=entries.length===1&&selectedDimension&&selectedDimension.visible!==false?String(dimensionsOnly[0].dimensionId):null;
    if(String(activeId??"")===String(next??""))return false;
    activeId=next;rebuild();return true;
  }
  function selectDimension(id){
    activeId=String(id);
    const key="dimension:"+encodeURIComponent(String(id));
    try{window.TubeBenderObjectContext?.replaceSelectionKeys?.([key],{announce:true});}catch{}
    rebuild();dispatch(id,"select");return dimensionById(id);
  }
  function closeEditor(){editor?.remove?.();editor=null;}
  function evaluateTarget(input,dimension){
    const kind=/angle/i.test(String(dimension.kind))?"angle":"length";
    const vars={...(project()?.formula_variables??{}),...(project()?.dimension_formula_variables??{}),VALUE:Number(dimension.value)||0};
    return dynamicInput.evaluateNumericInput(input,{kind,variables:vars});
  }
  function openEditor(dimension,event){
    closeEditor();const box=document.createElement("div");box.id="tbDimensionInlineEditor";
    box.style.cssText="position:fixed;z-index:120500;min-width:280px;padding:8px;background:#101927;color:#eef5ff;border:1px solid #4b6078;border-radius:7px;box-shadow:0 12px 34px rgba(0,0,0,.55);font:12px system-ui";
    box.innerHTML='<div style="display:flex;gap:6px;align-items:center"><b>Dimension</b><span style="flex:1"></span><button data-dim-edit-close>×</button></div>'+
      '<div style="display:grid;grid-template-columns:90px 1fr;gap:6px;margin-top:7px"><label>Mode</label><select data-dim-edit-mode><option>Reference</option><option>Driving</option></select><label>Value/formula</label><input data-dim-edit-value placeholder="100 / L1+25mm"><label>Status</label><span data-dim-edit-status></span></div>'+
      '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px"><button data-dim-edit-apply>Apply</button></div>';
    document.body.appendChild(box);editor=box;box.style.left=Math.min(event.clientX+8,window.innerWidth-300)+"px";box.style.top=Math.min(event.clientY+8,window.innerHeight-145)+"px";
    const mode=box.querySelector("[data-dim-edit-mode]"),input=box.querySelector("[data-dim-edit-value]"),status=box.querySelector("[data-dim-edit-status]");
    mode.value=dimension.mode??"Reference";input.value=dimension.mode==="Driving"?String(dimension.target_formula??dimension.target_value??dimension.value??""):String(dimension.value??"");status.textContent=String(dimension.status??"");
    const stale=staleDimension(dimension);
    if(stale){
      mode.disabled=true;input.disabled=true;
      status.textContent="Stale · "+String(dimension.stale_reason??"Section-derived reference changed");
      const apply=box.querySelector("[data-dim-edit-apply]");if(apply){apply.disabled=true;apply.title="Используйте явный Rebind в панели Измерения";}
    }
    const sync=()=>{if(stale)return;input.disabled=mode.value!=="Driving";input.title=input.disabled?"Reference Dimension не изменяет геометрию. Сначала переключите Mode на Driving.":"Введите число или формулу";};sync();mode.onchange=sync;
    box.querySelector("[data-dim-edit-close]").onclick=closeEditor;
    box.querySelector("[data-dim-edit-apply]").onclick=()=>{
      const id=String(dimension.id),nextMode=mode.value;
      if(nextMode==="Reference"){
        commit(id,"Dimension → Reference",d=>dimensions.setDimensionMode(d,"Reference"));closeEditor();return;
      }
      let target;try{target=evaluateTarget(input.value,dimension);}catch(error){toast(error?.message??error);return;}
      const ok=commit(id,"Изменить Driving Dimension",d=>{
        const driving=d.mode==="Driving"?d:dimensions.setDimensionMode(d,"Driving");
        return dimensions.setDrivingTarget(driving,target,{formula:input.value});
      });
      if(ok)closeEditor();
    };
    input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();box.querySelector("[data-dim-edit-apply]").click();}if(e.key==="Escape")closeEditor();});
  }
  function onPointerDown(event){
    if(event.button!==0||drag)return;const picked=pick(event);if(!picked)return;
    if(picked.data.dimensionGrip){beginDrag(event,picked);return;}
    selectDimension(picked.data.dimensionId);event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
  }
  function onPointerMove(event){if(drag)updateDrag(event);else updateHover(event);}
  function onPointerUp(event){if(drag)finishDrag(event);}
  function onDoubleClick(event){
    const picked=pick(event);if(!picked||!picked.data.dimensionText)return;
    const dimension=dimensionById(picked.data.dimensionId);if(!dimension)return;selectDimension(dimension.id);openEditor(dimension,event);
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
  }
  function onClick(event){if(Date.now()<suppressUntil){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();}}
  function onKey(event){
    if(event.key==="Escape"){if(drag)finishDrag(event,{cancel:true});else if(editor)closeEditor();else if(activeId){activeId=null;rebuild();}return;}
    if((event.key==="Delete"||event.key==="Backspace")&&activeId&&!drag&&!editor){
      event.preventDefault();deleteDimension(activeId);
    }
  }
  function installListeners(){
    canvas()?.addEventListener("pointerdown",onPointerDown,true);canvas()?.addEventListener("pointermove",onPointerMove,true);canvas()?.addEventListener("pointerleave",()=>{if(hoverLabel)hoverLabel.style.display="none";},true);window.addEventListener("pointermove",event=>{if(drag)onPointerMove(event);},true);window.addEventListener("pointerup",onPointerUp,true);canvas()?.addEventListener("dblclick",onDoubleClick,true);canvas()?.addEventListener("click",onClick,true);window.addEventListener("keydown",onKey,true);
  }
  async function install(){
    if(installed)return;installed=true;
    try{[dimensions,dynamicInput]=await Promise.all([import(DIMENSIONS_URL),import(DYNAMIC_INPUT_URL)]);}catch(error){console.error("Dimension grips runtime failed",error);return;}
    installListeners();rebuild();
    window.addEventListener("tubebender-dimension-change",()=>{syncActiveDimensionFromSelection();rebuild();});window.addEventListener("tubebender-assembly-change",()=>rebuild());window.addEventListener("tubebender-layer-change",()=>rebuild());window.addEventListener("tubebender-selection-change",syncActiveDimensionFromSelection);window.addEventListener("tubebender-history-change",()=>{syncActiveDimensionFromSelection();rebuild();});
    if(typeof renderAll==="function"&&!renderAll._tbDimensionGrips){const original=renderAll;renderAll=function(...args){const result=original.apply(this,args);try{rebuild();}catch{}return result;};renderAll._tbDimensionGrips=true;}
    window.TubeBenderDimensionGrips=Object.freeze({rebuild,selectDimension,deleteDimension,setDimensionVisible,syncActiveDimensionFromSelection,activeDimension:()=>dimensionById(activeId),dimensionLabelText,dimensionHoverText,openEditor:(id,event)=>{const d=dimensionById(id);if(d)openEditor(d,event??{clientX:100,clientY:100});}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();