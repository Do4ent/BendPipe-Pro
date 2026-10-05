(()=>{
  const DYNAMIC_INPUT_URL="__TB_GEOMETRY_GRIPS_DYNAMIC_INPUT_URL__";
  let dynamicInput=null,installed=false,group=null,previewGroup=null,panel=null,drag=null,activeHandle=null,suppressUntil=0,showAllGrips=false,internalEdit=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const snap=()=>window.TubeBenderSnapTracking??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const canvas=()=>document.getElementById("threeCanvas");
  const clone=v=>v==null?v:structuredClone(v);
  const scale=()=>typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const tubeById=id=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  function rowFor(tube,rowIndex){
    try{
      const state=eng()?.getState?.();
      if(String(state?.activeTubeId??"")===String(tube?.id))return state?.rows?.[rowIndex]??tube?.rows?.[rowIndex]??null;
    }catch{}
    return tube?.rows?.[rowIndex]??null;
  }
  function selectedGeometry(){
    const list=entries();if(list.length!==1)return null;
    const entry=list[0];
    if(entry.kind==="tube"){
      const tube=tubeById(entry.tubeId);return tube?{entry,tube,row:null,rowIndex:null,kind:"tube"}:null;
    }
    if(entry.kind!=="row")return null;
    const tube=tubeById(entry.tubeId),row=tube?rowFor(tube,Number(entry.rowIndex)):null;
    return tube&&row?{entry,tube,row,rowIndex:Number(entry.rowIndex),kind:row.type}:null;
  }
  function isDerivedReadonly(tube){
    return tube?.array_member?.derived_readonly===true||tube?.mirror_member?.derived_readonly===true||tube?.transform_stack_member?.derived_readonly===true;
  }
  function canEdit(selection,{notify=true}={}){
    if(!selection)return false;
    if(isDerivedReadonly(selection.tube)){if(notify)toast("Derived geometry: сначала Detach/Break для редактирования");return false;}
    const allowed=window.TubeBenderObjectLocks?.canSelection?.("geometry",{notify})!==false;
    return allowed&&eng()?.readonly?.()!==true;
  }
  function geometry(selection){
    try{return eng()?.geometryForTube?.(selection?.tube)??null;}catch{return null;}
  }
  function element(selection){
    const g=geometry(selection);return (g?.elements??[]).find(el=>Number(el?.rowIndex)===Number(selection?.rowIndex))??null;
  }
  function mm(v){
    if(!v)return null;const s=scale(),x=Number(v.x??v[0]),y=Number(v.y??v[1]),z=Number(v.z??v[2]);
    return [x,y,z].every(Number.isFinite)?{x:x/s,y:y/s,z:z/s}:null;
  }
  function scene(p){
    if(!p)return null;const s=scale(),x=Number(p.x),y=Number(p.y),z=Number(p.z);
    return [x,y,z].every(Number.isFinite)?new THREE.Vector3(x*s,y*s,z*s):null;
  }
  function vec(v){return new THREE.Vector3(Number(v?.x)||0,Number(v?.y)||0,Number(v?.z)||0);}
  function visualScale(p){
    if(typeof camera==="undefined"||!camera||!p)return .08;const w=p.clone();try{pipeGroup?.localToWorld?.(w);}catch{}
    return Math.max(.02,Math.min(1.3,camera.position.distanceTo(w)*.012));
  }
  function tag(object,data){
    object.userData={...(object.userData??{}),helper:true,objectSelectionHelper:true,geometryGripRuntime:true,geometryGrip:data};
    object.traverse?.(child=>{child.userData={...(child.userData??{}),helper:true,objectSelectionHelper:true,geometryGripRuntime:true,geometryGrip:data};});
    object.renderOrder=13600;return object;
  }
  function grip(point,color,data,shape="sphere"){
    const p=scene(point);if(!p)return null;const s=visualScale(p),mat=new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false});
    const geo=shape==="cube"?new THREE.BoxGeometry(.13*s,.13*s,.13*s):new THREE.SphereGeometry(.075*s,14,10);
    const mesh=new THREE.Mesh(geo,mat);mesh.position.copy(p);return tag(mesh,data);
  }
  function helperLine(a,b,color=0x74d9ff){
    const aa=scene(a),bb=scene(b);if(!aa||!bb)return null;
    const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([aa,bb]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.75,depthTest:false,depthWrite:false}));
    l.userData={helper:true,objectSelectionHelper:true,geometryGripRuntime:true};l.renderOrder=13590;return l;
  }
  function bendMidpoint(el){
    if(!el?.center||!el?.start||!el?.axis)return null;
    const center=el.center.clone(),radial=el.start.clone().sub(center),axis=el.axis.clone().normalize();
    const sweep=THREE.MathUtils.degToRad(Math.abs(Number(el.angleDeg)||0))*.5;
    return mm(center.clone().add(radial.applyAxisAngle(axis,sweep)));
  }
  function geometryPointMm(g,index){
    const point=g?.points?.[index];
    return point?.worldMm?{x:Number(point.worldMm.x),y:Number(point.worldMm.y),z:Number(point.worldMm.z)}:mm(point?.position);
  }
  function previousEndEdit(g,rowIndex){
    const index=Number(rowIndex);
    if(index<=0)return {edit:"origin",targetRowIndex:null};
    const previous=(g?.elements??[]).find(el=>Number(el.rowIndex)===index-1);
    if(!previous)return {edit:null,targetRowIndex:null};
    if(previous.type==="LINE")return {edit:"line-length",targetRowIndex:index-1};
    if(previous.type==="BEND")return {edit:"bend-angle",targetRowIndex:index-1};
    return {edit:null,targetRowIndex:null};
  }
  function rowAt(selection,index){
    return Number.isInteger(Number(index))?rowFor(selection.tube,Number(index)):null;
  }
  function descriptorForSharedNode(g,rowIndex,point,label,kind){
    const previous=previousEndEdit(g,rowIndex);
    return {kind,label,point,rowIndex:Number(rowIndex),edit:previous.edit,targetRowIndex:previous.targetRowIndex,readOnly:!previous.edit};
  }
  function tubeEndDescriptor(selection,g){
    const elements=g?.elements??[],last=elements.at(-1),point=geometryPointMm(g,(g?.points?.length??1)-1);
    if(!point)return null;
    if(!last)return {kind:"tube-p2",label:"P2",point,edit:null,readOnly:true};
    if(last.type==="LINE")return {kind:"tube-p2",label:"P2",point,edit:"line-length",targetRowIndex:Number(last.rowIndex),start:mm(last.start),direction:last.direction?{x:last.direction.x,y:last.direction.y,z:last.direction.z}:null};
    if(last.type==="BEND")return {kind:"tube-p2",label:"P2",point,edit:"bend-angle",targetRowIndex:Number(last.rowIndex),start:mm(last.start),center:mm(last.center),axis:last.axis?{x:last.axis.x,y:last.axis.y,z:last.axis.z}:null};
    return {kind:"tube-p2",label:"P2",point,edit:null,readOnly:true};
  }
  function bendPlanePoint(el){
    if(!el?.start||!el?.axis)return null;
    const distance=Math.max(12,Number(el.radiusMm)||0)*scale()*.7;
    return mm(el.start.clone().add(el.axis.clone().normalize().multiplyScalar(distance)));
  }
  function bendPlaneValue(selection,handle,p){
    const row=rowAt(selection,handle.targetRowIndex),start=vec(handle.start),target=vec(p).sub(start),incoming=vec(handle.directionIn??{x:1,y:0,z:0}).normalize(),current=vec(handle.planeAxis??{x:0,y:0,z:1});
    target.sub(incoming.clone().multiplyScalar(target.dot(incoming)));
    current.sub(incoming.clone().multiplyScalar(current.dot(incoming)));
    if(target.lengthSq()<1e-12||current.lengthSq()<1e-12)return null;
    const delta=signedAngleAround(current,target,incoming);
    const base=Number(row?.rot??row?.rotation??0)||0;
    let value=base+delta;
    while(value>180)value-=360;
    while(value<=-180)value+=360;
    return value;
  }
  function drivingDimensionsFor(selection,handle){
    const dims=Array.isArray(project()?.engineering_dimensions)?project().engineering_dimensions:[];
    const row=rowAt(selection,handle.targetRowIndex),ids=new Set([String(selection.tube.id)]);
    const subIds=new Set([String(row?.elementId??""),handle.kind==="tube-p1"?"P1":"",handle.kind==="tube-p2"?"P2":""]);
    return dims.filter(dim=>dim?.mode==="Driving"&&(dim.references??[]).some(ref=>ids.has(String(ref?.object_id??""))&&(ref?.subentity_id==null||subIds.has(String(ref.subentity_id)))));
  }
  function synchronizeDrivingDimensions(selection,handle,patch,formula=null){
    if(!Number.isFinite(Number(patch?.value)))return;
    for(const dim of drivingDimensionsFor(selection,handle)){
      dim.target_value=Number(patch.value);
      dim.target_formula=formula==null||String(formula).trim()===""?null:String(formula).trim();
      dim.status="NeedsSolve";
    }
  }
  function notifyAssociativeDependents(selection,handle){
    try{eng()?.diagnoseTube?.(selection?.tube);}catch{}
    try{window.dispatchEvent(new CustomEvent("tubebender-dimension-change",{detail:{reason:"geometry-grip",tube_id:String(selection?.tube?.id??""),row_index:handle?.targetRowIndex??selection?.rowIndex??null}}));}catch{}
    try{window.dispatchEvent(new CustomEvent("tubebender-constraint-change",{detail:{reason:"geometry-grip",tube_id:String(selection?.tube?.id??"")}}));}catch{}
  }
  function handleDescriptors(selection){
    if(!selection)return [];const g=geometry(selection);
    if(selection.kind==="tube"){
      const p1=geometryPointMm(g,0)??clone(selection.tube.origin??{x:0,y:0,z:0}),p2=tubeEndDescriptor(selection,g);
      const nodes=(g?.points??[]).slice(1,-1).map((point,index)=>({
        kind:"tube-node",label:"Tube node",point:geometryPointMm(g,index+1),edit:null,readOnly:true,nodeIndex:index+1
      })).filter(item=>item.point);
      return [
        {kind:"tube-p1",label:"P1 / Origin",point:p1,field:"origin",edit:"origin",targetRowIndex:null},
        p2,
        ...nodes
      ].filter(Boolean);
    }
    const el=(g?.elements??[]).find(x=>Number(x.rowIndex)===selection.rowIndex);if(!el)return [];
    if(selection.row.type==="LINE"){
      const end=mm(el.end),start=mm(el.start),mid=start&&end?{x:(start.x+end.x)/2,y:(start.y+end.y)/2,z:(start.z+end.z)/2}:null;
      const direction=el.direction?{x:el.direction.x,y:el.direction.y,z:el.direction.z}:null;
      const startDescriptor=start?descriptorForSharedNode(g,selection.rowIndex,start,"LINE start","line-start"):null;
      return [
        startDescriptor,
        mid?{kind:"line-mid",label:"LINE midpoint / length",field:"L",point:mid,start,direction,rowIndex:selection.rowIndex,edit:"line-mid-length",targetRowIndex:selection.rowIndex}:null,
        end?{kind:"line-end",label:"LINE end / length",field:"L",point:end,start,direction,rowIndex:selection.rowIndex,edit:"line-length",targetRowIndex:selection.rowIndex}:null
      ].filter(Boolean);
    }
    if(selection.row.type==="BEND"){
      const end=mm(el.end),mid=bendMidpoint(el),center=mm(el.center),start=mm(el.start),planePoint=bendPlanePoint(el);
      const axis=el.axis?{x:el.axis.x,y:el.axis.y,z:el.axis.z}:null,directionIn=el.directionIn?{x:el.directionIn.x,y:el.directionIn.y,z:el.directionIn.z}:null;
      const tangentIn=start?descriptorForSharedNode(g,selection.rowIndex,start,"BEND tangency in","bend-tangent-in"):null;
      return [
        tangentIn,
        end?{kind:"bend-tangent-out",label:"BEND tangency out / angle",field:"angle",point:end,start,center,rowIndex:selection.rowIndex,axis,edit:"bend-angle",targetRowIndex:selection.rowIndex}:null,
        center?{kind:"bend-center",label:"BEND center",point:center,center,rowIndex:selection.rowIndex,edit:null,readOnly:true}:null,
        mid?{kind:"bend-radius",label:"BEND CLR",field:"clr",point:mid,start,center,rowIndex:selection.rowIndex,axis,edit:"bend-radius",targetRowIndex:selection.rowIndex}:null,
        planePoint?{kind:"bend-plane",label:"BEND plane",field:"rot",point:planePoint,start,center,rowIndex:selection.rowIndex,axis,directionIn,planeAxis:axis,edit:"bend-plane",targetRowIndex:selection.rowIndex}:null
      ].filter(Boolean);
    }
    return [];
  }
  function handleKey(handle){
    const p=handle?.point??{};
    return [handle?.kind,handle?.rowIndex??"",handle?.targetRowIndex??"",Number(p.x).toFixed(5),Number(p.y).toFixed(5),Number(p.z).toFixed(5)].join("|");
  }
  function uniqueHandles(list=[]){
    const map=new Map();
    for(const handle of list)if(handle?.point)map.set(handleKey(handle),handle);
    return [...map.values()];
  }
  function rowSelection(selection,rowIndex){
    const row=rowFor(selection.tube,rowIndex);
    return row?{entry:{kind:"row",tubeId:String(selection.tube.id),rowIndex},tube:selection.tube,row,rowIndex,kind:row.type}:null;
  }
  function allTubeHandles(selection){
    const base={entry:{kind:"tube",tubeId:String(selection.tube.id)},tube:selection.tube,row:null,rowIndex:null,kind:"tube"};
    const out=[...handleDescriptors(base)];
    for(let index=0;index<(selection.tube.rows??[]).length;index++){
      const child=rowSelection(selection,index);if(child)out.push(...handleDescriptors(child));
    }
    return uniqueHandles(out);
  }
  function internalNeighborHandles(selection){
    const index=Number(selection.rowIndex),out=[...handleDescriptors(selection)];
    for(const near of [index-1,index+1]){
      if(near<0||near>=(selection.tube.rows??[]).length)continue;
      const child=rowSelection(selection,near);if(!child)continue;
      const nearest=handleDescriptors(child).filter(handle=>
        ["line-start","line-end","bend-tangent-in","bend-tangent-out","tube-p1","tube-p2"].includes(String(handle.kind))
      );
      out.push(...nearest);
    }
    return uniqueHandles(out);
  }
  function gripDisplayMode(selection){
    if(!selection)return "none";
    if(showAllGrips)return "all";
    if(selection.kind==="tube")return "whole";
    if(internalEdit&&String(internalEdit.tubeId)===String(selection.tube.id)&&Number(internalEdit.rowIndex)===Number(selection.rowIndex))return "internal";
    return "subelement";
  }
  function contextHandleDescriptors(selection){
    const mode=gripDisplayMode(selection);
    if(mode==="all")return allTubeHandles(selection);
    if(mode==="internal")return internalNeighborHandles(selection);
    return handleDescriptors(selection);
  }
  function clearGroup(){if(group?.parent)group.parent.remove(group);group=null;}
  function clearPreview(){if(previewGroup?.parent)previewGroup.parent.remove(previewGroup);previewGroup=null;}
  function rebuild(){
    clearGroup();clearPreview();const selection=selectedGeometry();ensurePanel();
    if(!selection||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup){updatePanel(null);return false;}
    const handles=contextHandleDescriptors(selection),g=new THREE.Group();g.name="Geometry Grips";g.userData={helper:true,objectSelectionHelper:true,geometryGripRuntime:true};
    for(const h of handles){
      const color=h.readOnly?0x9aa7b4:h.edit==="line-length"||h.edit==="line-mid-length"?0x65d6ff:h.edit==="bend-angle"?0xffa45c:h.edit==="bend-radius"?0x73e19c:h.edit==="bend-plane"?0xd88cff:0xffffff;
      const node=grip(h.point,color,h,(h.edit==="origin"||h.kind==="tube-p1"||h.kind==="tube-p2")?"cube":"sphere");if(node)g.add(node);
      if(h.start){const l=helperLine(h.start,h.point,color);if(l)g.add(l);}
      if(h.center&&h.kind==="bend-radius"){const l=helperLine(h.center,h.point,color);if(l)g.add(l);}
    }
    pipeGroup.add(g);group=g;updatePanel(selection);try{markViewerDirty?.();}catch{}return true;
  }
  function ray(event){
    const c=canvas(),rect=c?.getBoundingClientRect?.();if(!c||!rect?.width||!rect?.height||typeof camera==="undefined")return null;
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1),r=new THREE.Raycaster();r.setFromCamera(mouse,camera);return r;
  }
  function pick(event){
    const r=ray(event);if(!r||!group)return null;
    for(const hit of r.intersectObjects(group.children,true)){
      let o=hit.object;while(o&&o!==group){if(o.userData?.geometryGrip)return {object:o,handle:o.userData.geometryGrip,hit};o=o.parent;}
    }return null;
  }
  function planePoint(event,anchor,normal=null){
    const r=ray(event),p=scene(anchor);if(!r||!p)return null;
    const n=normal?vec(normal).normalize():(()=>{const q=new THREE.Vector3();camera.getWorldDirection(q);return q;})();
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(n,p),hit=new THREE.Vector3();
    return r.ray.intersectPlane(plane,hit)?mm(hit):null;
  }
  function currentPointerPoint(event,handle){
    const candidate=snap()?.currentCandidate?.(),sp=candidate?.point;
    if(sp&&[sp.x,sp.y,sp.z].every(Number.isFinite))return {x:Number(sp.x),y:Number(sp.y),z:Number(sp.z),fromSnap:true};
    const normal=handle.edit==="bend-plane"?handle.directionIn:(String(handle.edit??"").startsWith("bend-")?handle.axis:null);
    return planePoint(event,handle.center??handle.start??handle.point,normal);
  }
  function lineValue(handle,p){
    const start=vec(handle.start),end=vec(p),dir=vec(handle.direction??{x:1,y:0,z:0});
    if(dir.lengthSq()<1e-12)return null;dir.normalize();return end.sub(start).dot(dir);
  }
  function bendRadiusValue(handle,p){
    const center=vec(handle.center),point=vec(p),axis=vec(handle.axis??{x:0,y:0,z:1}).normalize(),rel=point.sub(center);
    return rel.sub(axis.multiplyScalar(rel.dot(axis))).length();
  }
  function signedAngleAround(startVec,endVec,axis){
    const a=startVec.clone().normalize(),b=endVec.clone().normalize(),n=axis.clone().normalize();
    return THREE.MathUtils.radToDeg(Math.atan2(n.dot(a.clone().cross(b)),THREE.MathUtils.clamp(a.dot(b),-1,1)));
  }
  function bendAngleValue(selection,handle,p){
    const center=vec(handle.center),start=vec(handle.start).sub(center),target=vec(p).sub(center),axis=vec(handle.axis??{x:0,y:0,z:1});
    if(start.lengthSq()<1e-12||target.lengthSq()<1e-12||axis.lengthSq()<1e-12)return null;
    target.sub(axis.clone().normalize().multiplyScalar(target.dot(axis.clone().normalize())));
    if(target.lengthSq()<1e-12)return null;
    const unsigned=Math.abs(signedAngleAround(start,target,axis)),sign=Number(selection.row.angle)<0?-1:1;
    return sign*Math.max(.01,Math.min(179.99,unsigned));
  }
  function patchFromPoint(selection,handle,p){
    if(!p||handle.readOnly||!handle.edit)return null;
    if(handle.edit==="origin")return {origin:{x:p.x,y:p.y,z:p.z}};
    if(handle.edit==="line-length"){
      const value=lineValue(handle,p);return Number.isFinite(value)?{value:Math.max(.001,value)}:null;
    }
    if(handle.edit==="line-mid-length"){
      const value=lineValue(handle,p);return Number.isFinite(value)?{value:Math.max(.001,value*2)}:null;
    }
    if(handle.edit==="bend-radius"){
      const value=bendRadiusValue(handle,p);return Number.isFinite(value)?{value:Math.max(.001,value)}:null;
    }
    if(handle.edit==="bend-angle"){
      const targetSelection={...selection,row:rowAt(selection,handle.targetRowIndex),rowIndex:handle.targetRowIndex};
      const value=bendAngleValue(targetSelection,handle,p);return Number.isFinite(value)?{value}:null;
    }
    if(handle.edit==="bend-plane"){
      const value=bendPlaneValue(selection,handle,p);return Number.isFinite(value)?{value}:null;
    }
    return null;
  }
  function previewTube(selection,handle,patch){
    if(!patch)return null;const tube=clone(selection.tube);tube.id="__geometry_grip_preview__"+String(selection.tube.id);
    if(handle.edit==="origin")tube.origin=clone(patch.origin);
    else{
      const index=Number(handle.targetRowIndex??selection.rowIndex);
      if(!Array.isArray(tube.rows)||!tube.rows[index])return null;
      const row=tube.rows[index];
      if(handle.edit==="line-length"||handle.edit==="line-mid-length"){row.L=patch.value;row.LFormula=String(patch.value);}
      if(handle.edit==="bend-angle"){row.angle=patch.value;row.angleFormula=String(patch.value);}
      if(handle.edit==="bend-radius"){row.clr=patch.value;row.clrFormula=String(patch.value);row.clrSource="geometry_grip_preview";}
      if(handle.edit==="bend-plane"){row.rot=patch.value;row.rotFormula=String(patch.value);}
    }
    return tube;
  }
  function renderPreview(selection,handle,patch){
    clearPreview();const tube=previewTube(selection,handle,patch);if(!tube||!pipeGroup)return;
    let geometry;try{geometry=eng()?.geometryForTube?.(tube);}catch{return;}
    if(!geometry)return;const g=new THREE.Group();g.name="Geometry Grip Preview";g.userData={helper:true,objectSelectionHelper:true,geometryGripPreview:true};
    for(const el of geometry.elements??[]){
      if(el.type==="LINE"){
        const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([el.start,el.end]),new THREE.LineBasicMaterial({color:0x59e6ff,transparent:true,opacity:.48,depthTest:false,depthWrite:false}));l.userData={helper:true,objectSelectionHelper:true,geometryGripPreview:true};g.add(l);
      }else if(el.type==="BEND"&&el.center&&el.start&&el.axis){
        const radial=el.start.clone().sub(el.center),axis=el.axis.clone().normalize(),sweep=THREE.MathUtils.degToRad(Math.abs(Number(el.angleDeg)||0)),pts=[];
        for(let i=0;i<=24;i++)pts.push(el.center.clone().add(radial.clone().applyAxisAngle(axis,sweep*i/24)));
        const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x59e6ff,transparent:true,opacity:.48,depthTest:false,depthWrite:false}));l.userData={helper:true,objectSelectionHelper:true,geometryGripPreview:true};g.add(l);
      }
    }
    pipeGroup.add(g);previewGroup=g;try{markViewerDirty?.();}catch{}
  }
  function handleValue(selection,handle){
    if(handle.edit==="origin")return selection.tube.origin;
    const row=rowAt(selection,handle.targetRowIndex??selection.rowIndex);
    if(handle.edit==="line-length"||handle.edit==="line-mid-length")return Number(row?.L);
    if(handle.edit==="bend-angle")return Number(row?.angle);
    if(handle.edit==="bend-radius")return Number(row?.clr);
    if(handle.edit==="bend-plane")return Number(row?.rot??0);
    return null;
  }
  function updatePanel(selection){
    ensurePanel();const handles=selection?contextHandleDescriptors(selection):[];panel.classList.toggle("open",!!selection&&handles.length>0);
    const title=panel.querySelector("[data-geometry-grip-title]"),input=panel.querySelector("[data-geometry-grip-value]"),modeNode=panel.querySelector("[data-geometry-grip-mode]");
    if(title)title.textContent=activeHandle?.label??(selection?.kind==="tube"?"Tube grips":"Geometry grips");
    if(modeNode)modeNode.textContent=gripDisplayMode(selection);
    if(!selection||!activeHandle){if(input){input.value="";input.disabled=true;}return;}
    const value=handleValue(selection,activeHandle);if(input){
      input.disabled=activeHandle.readOnly===true||activeHandle.edit==="origin"||!activeHandle.edit;
      input.value=typeof value==="number"&&Number.isFinite(value)?String(value):"";
      input.placeholder=activeHandle.edit==="line-length"||activeHandle.edit==="line-mid-length"?"L / formula":activeHandle.edit==="bend-angle"?"angle / formula":activeHandle.edit==="bend-plane"?"plane rotation / formula":activeHandle.edit==="bend-radius"?"CLR / formula":"";
    }
  }
  function setPanelPreview(handle,patch){
    const out=panel?.querySelector("[data-geometry-grip-preview]");if(!out)return;
    if(handle.edit==="origin")out.textContent=patch?.origin?"Preview origin: "+[patch.origin.x,patch.origin.y,patch.origin.z].map(v=>Number(v).toFixed(2)).join("; "):"";
    else out.textContent=Number.isFinite(Number(patch?.value))?"Preview: "+Number(patch.value).toFixed(3):"";
  }
  function begin(event,picked){
    const selection=selectedGeometry(),handle=picked?.handle;if(!selection||!handle)return false;
    activeHandle=handle;updatePanel(selection);
    if(handle.readOnly||!handle.edit){toast(handle.label+": опорный grip; редактирование этой точки неоднозначно");return false;}
    if(!canEdit(selection))return false;
    snap()?.startCommand?.("geometry-grip",{ortho:handle.edit==="line-length"||handle.edit==="line-mid-length",polar:String(handle.edit).startsWith("bend-")});
    drag={handle,selectionKey:{tubeId:String(selection.tube.id),rowIndex:selection.rowIndex},patch:null};
    try{if(controls)controls.enabled=false;}catch{}
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function update(event){
    if(!drag)return false;const selection=selectedGeometry();if(!selection||String(selection.tube.id)!==drag.selectionKey.tubeId)return false;
    const p=currentPointerPoint(event,drag.handle),patch=patchFromPoint(selection,drag.handle,p);if(!patch)return false;
    drag.patch=patch;renderPreview(selection,drag.handle,patch);setPanelPreview(drag.handle,patch);
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function boundAllowed(selection,apply,rollback){
    let before=null;try{
      if(String(eng()?.getState?.()?.activeTubeId??"")===String(selection.tube.id)&&typeof analyzePipeBounds==="function")before=analyzePipeBounds();
      else if(typeof analyzeTubeBounds==="function")before=analyzeTubeBounds(selection.tube);
    }catch{}
    apply();
    try{
      let after=null;
      if(String(eng()?.getState?.()?.activeTubeId??"")===String(selection.tube.id)&&typeof analyzePipeBounds==="function")after=analyzePipeBounds();
      else if(typeof analyzeTubeBounds==="function")after=analyzeTubeBounds(selection.tube);
      const assessment=before&&after&&typeof boundsAssessment==="function"?boundsAssessment(before,after):null;
      if((assessment&&assessment.allowed===false)||(!assessment&&before?.valid===true&&after?.valid===false)){rollback();toast(assessment?.message??"Изменение создаёт нарушение габаритной рамки");return false;}
    }catch{}
    return true;
  }
  function commitPatch(selection,handle,patch,{formula=null,label="Geometry grip"}={}){
    if(!patch||!handle?.edit||!canEdit(selection))return false;
    const command=eng()?.modelCommand;
    const mutate=()=>{
      if(handle.edit==="origin"){
        const state=eng()?.getState?.(),active=String(state?.activeTubeId??"")===String(selection.tube.id);
        const old=clone(active?(state?.origin??selection.tube.origin??{x:0,y:0,z:0}):(selection.tube.origin??{x:0,y:0,z:0}));
        return boundAllowed(selection,()=>{
          if(active)state.origin=clone(patch.origin);
          selection.tube.origin=clone(patch.origin);
        },()=>{
          if(active)state.origin=clone(old);
          selection.tube.origin=clone(old);
        });
      }
      const index=Number(handle.targetRowIndex??selection.rowIndex),row=rowFor(selection.tube,index);if(!row)return false;
      const old={L:row.L,LFormula:row.LFormula,angle:row.angle,angleFormula:row.angleFormula,clr:row.clr,clrFormula:row.clrFormula,clrSource:row.clrSource,rot:row.rot,rotFormula:row.rotFormula};
      const apply=()=>{
        if(handle.edit==="line-length"||handle.edit==="line-mid-length"){row.L=Number(patch.value.toFixed(6));row.LFormula=formula??String(row.L);}
        else if(handle.edit==="bend-angle"){row.angle=Number(patch.value.toFixed(6));row.angleFormula=formula??String(row.angle);}
        else if(handle.edit==="bend-radius"){row.clr=Number(patch.value.toFixed(6));row.clrFormula=formula??String(row.clr);row.clrSource=formula?"formula_geometry_grip":"geometry_grip";}
        else if(handle.edit==="bend-plane"){row.rot=Number(patch.value.toFixed(6));row.rotFormula=formula??String(row.rot);}
        synchronizeDrivingDimensions(selection,handle,patch,formula);
      };
      const rollback=()=>Object.assign(row,old);
      return boundAllowed(selection,apply,rollback);
    };
    let ok;try{ok=typeof command==="function"?command(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    notifyAssociativeDependents(selection,handle);
    dispatch(handle.kind);rebuild();return true;
  }
  function finish(event,{cancel=false}={}){
    if(!drag)return false;const state=drag;drag=null;clearPreview();snap()?.endCommand?.();try{if(controls)controls.enabled=true;}catch{}
    const selection=selectedGeometry();let ok=true;if(!cancel&&selection&&state.patch)ok=commitPatch(selection,state.handle,state.patch,{label:"3D Geometry grip"});
    suppressUntil=Date.now()+120;rebuild();event?.preventDefault?.();event?.stopPropagation?.();event?.stopImmediatePropagation?.();return ok;
  }
  function exactPatch(selection,handle,raw){
    if(handle.readOnly||!handle.edit)throw new Error("Этот grip является опорным и не имеет однозначного локального изменения");
    if(handle.edit==="origin")throw new Error("Origin редактируется drag/Snap или командой Move");
    const vars={...(project()?.formula_variables??{}),...(project()?.geometry_formula_variables??{})};
    const kind=handle.edit==="bend-angle"||handle.edit==="bend-plane"?"angle":"length",value=dynamicInput.evaluateNumericInput(raw,{kind,variables:vars});
    if(handle.edit==="line-length"||handle.edit==="line-mid-length"||handle.edit==="bend-radius"){
      if(!(value>.0001))throw new Error("Значение должно быть > 0");
      return {value};
    }
    if(handle.edit==="bend-angle"){
      if(Math.abs(value)>.001&&Math.abs(value)<180)return {value};
      throw new Error("Угол должен быть в диапазоне (-180; 180) без 0");
    }
    if(handle.edit==="bend-plane"){
      if(Number.isFinite(value))return {value};
      throw new Error("Поворот плоскости должен быть числом");
    }
    return null;
  }
  function applyExact(){
    const selection=selectedGeometry();if(!selection||!activeHandle)return false;
    const raw=panel?.querySelector("[data-geometry-grip-value]")?.value??"";
    let patch;try{patch=exactPatch(selection,activeHandle,raw);}catch(error){toast(error?.message??error);return false;}
    return commitPatch(selection,activeHandle,patch,{formula:String(raw).trim(),label:"Exact Geometry grip"});
  }
  function ensurePanel(){
    if(panel)return panel;const style=document.createElement("style");style.id="tbGeometryGripStyles";style.textContent='#tbGeometryGripPanel{position:fixed;left:14px;bottom:116px;z-index:120314;width:310px;padding:8px;border:1px solid #41566f;border-radius:8px;background:rgba(13,22,32,.96);color:#eaf3fd;font:11px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.45);display:none}#tbGeometryGripPanel.open{display:block}#tbGeometryGripPanel .gg-row{display:flex;gap:6px;align-items:center;margin:5px 0}#tbGeometryGripPanel input{width:125px;background:#0a121b;color:#fff;border:1px solid #40536a;border-radius:4px;padding:4px}#tbGeometryGripPanel button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:4px 7px;cursor:pointer}.gg-grow{flex:1}.gg-muted{color:#8295aa}';document.head.appendChild(style);
    panel=document.createElement("section");panel.id="tbGeometryGripPanel";panel.innerHTML='<div class="gg-row"><b data-geometry-grip-title>Geometry grips</b><span class="gg-grow"></span><span class="gg-muted">mode: <b data-geometry-grip-mode>whole</b></span></div><div class="gg-row"><label><input type="checkbox" data-geometry-show-all> Show all grips</label><span class="gg-grow"></span><span class="gg-muted">Snap + formula</span></div><div class="gg-row"><label>Exact</label><input data-geometry-grip-value><button data-geometry-grip-apply>Apply</button></div><div class="gg-row"><span class="gg-muted" data-geometry-grip-preview>Выберите grip и перетащите его</span></div>';document.body.appendChild(panel);panel.querySelector("[data-geometry-grip-apply]").onclick=applyExact;panel.querySelector("[data-geometry-show-all]").onchange=event=>{showAllGrips=event.target.checked===true;activeHandle=null;rebuild();};return panel;
  }
  function dispatch(reason){try{window.dispatchEvent(new CustomEvent("tubebender-geometry-grip-change",{detail:{reason:String(reason??"change")}}));}catch{}}
  function onDown(event){if(event.button!==0||drag)return;const picked=pick(event);if(picked)begin(event,picked);}
  function onMove(event){if(drag)update(event);}
  function onUp(event){if(drag)finish(event);}
  function onClick(event){if(Date.now()<suppressUntil){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();}}
  function onDoubleClick(event){
    if(event.button!==0)return;
    const selection=selectedGeometry();
    if(!selection||selection.kind==="tube")return;
    internalEdit={tubeId:String(selection.tube.id),rowIndex:Number(selection.rowIndex)};
    activeHandle=null;rebuild();
  }
  function onKey(event){
    if(event.key!=="Escape")return;
    if(drag){finish(event,{cancel:true});return;}
    if(internalEdit){internalEdit=null;activeHandle=null;rebuild();}
  }
  function selectionChanged(){
    if(drag)return;
    const selection=selectedGeometry();
    if(!selection||selection.kind==="tube"||String(internalEdit?.tubeId??"")!==String(selection.tube.id)||Number(internalEdit?.rowIndex)!==Number(selection.rowIndex))internalEdit=null;
    activeHandle=null;rebuild();
  }
  async function install(){
    if(installed)return;installed=true;try{dynamicInput=await import(DYNAMIC_INPUT_URL);}catch(error){console.error("Geometry grips runtime failed",error);return;}
    ensurePanel();canvas()?.addEventListener("pointerdown",onDown,true);window.addEventListener("pointermove",onMove,true);window.addEventListener("pointerup",onUp,true);canvas()?.addEventListener("click",onClick,true);canvas()?.addEventListener("dblclick",onDoubleClick,false);window.addEventListener("keydown",onKey,true);
    window.addEventListener("tubebender-selection-change",selectionChanged);window.addEventListener("tubebender-lock-change",rebuild);window.addEventListener("tubebender-layer-change",rebuild);window.addEventListener("tubebender-tolerance-change",rebuild);
    if(typeof renderAll==="function"&&!renderAll._tbGeometryGrips){const original=renderAll;renderAll=function(...args){const result=original.apply(this,args);try{rebuild();}catch{}return result;};renderAll._tbGeometryGrips=true;}
    rebuild();window.TubeBenderGeometryGrips=Object.freeze({rebuild,selectedGeometry,handleDescriptors,contextHandleDescriptors,gripDisplayMode,applyExact,setShowAll:(value)=>{showAllGrips=value===true;rebuild();},enterInternal:(tubeId,rowIndex)=>{internalEdit={tubeId:String(tubeId),rowIndex:Number(rowIndex)};rebuild();},exitInternal:()=>{internalEdit=null;rebuild();}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();