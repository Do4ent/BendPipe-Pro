(()=>{
  let installed=false,group=null,previewGroup=null,panel=null,drag=null,activeHandle=null,suppressUntil=0;
  const eng=()=>window.TubeBenderEngineering??null;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const arrays=()=>window.TubeBenderAssociativeArrays??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const canvas=()=>document.getElementById("threeCanvas");
  const scale=()=>typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  const toast=(m)=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const clone=v=>v==null?v:structuredClone(v);
  const tubeById=id=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  const entries=()=>ctx()?.selectionEntries?.()??[];
  function activeDefinition(){
    const selected=entries().filter(e=>e.kind==="tube");
    if(selected.length!==1)return null;
    const tube=tubeById(selected[0].tubeId);if(!tube)return null;
    const memberId=tube?.array_member?.array_id;
    if(memberId)return arrays()?.definitionById?.(memberId)??null;
    const defs=(arrays()?.definitions?.()??[]).filter(def=>(def.source_tube_ids??[]).some(id=>String(id)===String(tube.id)));
    return defs.length===1?defs[0]:null;
  }
  function sourceTube(def){
    const id=def?.source_tube_ids?.[0];return id?tubeById(id):null;
  }
  function mmToScene(p){const s=scale();return new THREE.Vector3((Number(p?.x)||0)*s,(Number(p?.y)||0)*s,(Number(p?.z)||0)*s);}
  function sceneToMm(p){const s=scale();return {x:p.x/s,y:p.y/s,z:p.z/s};}
  function vec(v,f={x:0,y:0,z:0}){const x=Number(v?.x??f.x),y=Number(v?.y??f.y),z=Number(v?.z??f.z);return new THREE.Vector3(x,y,z);}
  function unit(v,fallback=new THREE.Vector3(1,0,0)){const n=v.clone();return n.lengthSq()>1e-12?n.normalize():fallback.clone().normalize();}
  function evaluated(def){try{return arrays()?.evaluatedParameters?.(def,project())??def?.parameters??{};}catch{return def?.parameters??{};}}
  function visualScale(point){
    if(typeof camera==="undefined"||!camera)return .2;
    const world=point.clone();try{pipeGroup?.localToWorld?.(world);}catch{}
    return Math.max(.035,Math.min(2.5,camera.position.distanceTo(world)*.018));
  }
  function tag(object,data){
    object.userData={...(object.userData??{}),helper:true,objectSelectionHelper:true,arrayGrip:true,arrayGripHandle:data};
    object.traverse?.(child=>{child.userData={...(child.userData??{}),helper:true,objectSelectionHelper:true,arrayGrip:true,arrayGripHandle:data};});
    object.renderOrder=14000;return object;
  }
  function material(color,opacity=.95){return new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthTest:false,depthWrite:false});}
  function sphere(point,color,data,size=1){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.07*size,14,10),material(color));
    mesh.position.copy(point);return tag(mesh,data);
  }
  function cube(point,color,data,size=1){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.12*size,.12*size,.12*size),material(color));
    mesh.position.copy(point);return tag(mesh,data);
  }
  function cone(point,direction,color,data,size=1){
    const mesh=new THREE.Mesh(new THREE.ConeGeometry(.075*size,.20*size,14),material(color));
    mesh.position.copy(point);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),unit(direction));
    return tag(mesh,data);
  }
  function line(a,b,color){
    const geometry=new THREE.BufferGeometry().setFromPoints([a,b]);
    const obj=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.7,depthTest:false,depthWrite:false}));
    obj.userData={helper:true,objectSelectionHelper:true,arrayGrip:true};obj.renderOrder=13999;return obj;
  }
  function clearGroup(){if(group?.parent)group.parent.remove(group);group=null;}
  function clearPreview(){if(previewGroup?.parent)previewGroup.parent.remove(previewGroup);previewGroup=null;}
  function circularBasis(params,source){
    const axis=unit(vec(params.axis,{x:0,y:0,z:1}),new THREE.Vector3(0,0,1));
    const center=vec(params.center),origin=vec(source?.origin);
    const rel=origin.clone().sub(center),axial=axis.clone().multiplyScalar(rel.dot(axis));
    let radial=rel.clone().sub(axial);
    if(radial.lengthSq()<1e-12){
      const helper=Math.abs(axis.x)<.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0);
      radial=axis.clone().cross(helper);
    }
    const u=radial.normalize(),v=axis.clone().cross(u).normalize();
    return {axis,center,u,v,axial};
  }
  function polarPoint(basis,radius,angleDeg){
    const a=THREE.MathUtils.degToRad(angleDeg);
    return basis.center.clone().add(basis.axial).add(basis.u.clone().multiplyScalar(radius*Math.cos(a))).add(basis.v.clone().multiplyScalar(radius*Math.sin(a)));
  }
  function gripDescriptors(def){
    const source=sourceTube(def),params=evaluated(def);if(!source)return [];
    const origin=vec(source.origin),out=[];
    if(def.type==="Linear"){
      const dir=unit(vec(params.direction,{x:1,y:0,z:0})),step=Number(params.step)||0,count=Math.max(1,Math.trunc(Number(params.count)||1));
      out.push({kind:"step",field:"step",point:origin.clone().add(dir.clone().multiplyScalar(step)),axis:dir,label:"Step"});
      out.push({kind:"count",field:"count",point:origin.clone().add(dir.clone().multiplyScalar(step*Math.max(1,count-1))),axis:dir,label:"Count"});
      out.push({kind:"direction",field:"direction",point:origin.clone().add(dir.clone().multiplyScalar(Math.max(Math.abs(step),40)*1.25)),axis:dir,label:"Direction"});
    }else if(def.type==="Matrix"){
      const dirs=(params.directions??[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]).map((d,i)=>unit(vec(d),i===0?new THREE.Vector3(1,0,0):i===1?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1)));
      const steps=params.steps??[0,0,0],counts=params.counts??[1,1,1];
      for(let i=0;i<3;i++){
        const step=Number(steps[i])||0,count=Math.max(1,Math.trunc(Number(counts[i])||1)),suffix=["x","y","z"][i];
        out.push({kind:"matrix-step",index:i,field:"step_"+suffix,point:origin.clone().add(dirs[i].clone().multiplyScalar(step)),axis:dirs[i],label:"S"+suffix.toUpperCase()});
        out.push({kind:"matrix-count",index:i,field:"count_"+suffix,point:origin.clone().add(dirs[i].clone().multiplyScalar(step*Math.max(1,count-1))),axis:dirs[i],label:"N"+suffix.toUpperCase()});
        out.push({kind:"matrix-direction",index:i,field:"direction_"+suffix,point:origin.clone().add(dirs[i].clone().multiplyScalar(Math.max(Math.abs(step),40)*1.25)),axis:dirs[i],label:"Dir "+suffix.toUpperCase()});
      }
    }else if(def.type==="Circular"){
      const basis=circularBasis(params,source),radius=params.radius_mm==null?vec(source.origin).sub(basis.center).sub(basis.axial).length():Math.max(0,Number(params.radius_mm)||0);
      const total=Number(params.total_angle_deg)||360,initial=Number(params.initial_angle_deg)||0,sign=params.clockwise?-1:1;
      out.push({kind:"radius",field:"radius_mm",point:polarPoint(basis,radius,0),basis,radius,label:"Radius"});
      out.push({kind:"initial-angle",field:"initial_angle_deg",point:polarPoint(basis,radius,sign*initial),basis,radius,label:"Initial angle"});
      out.push({kind:"total-angle",field:"total_angle_deg",point:polarPoint(basis,radius,sign*(initial+total)),basis,radius,label:"Total angle"});
      out.push({kind:"count",field:"count",point:polarPoint(basis,radius,sign*(initial+total*.5)).add(basis.axis.clone().multiplyScalar(Math.max(radius*.12,20))),basis,radius,label:"Count"});
      out.push({kind:"clockwise",field:"clockwise",point:basis.center.clone().add(basis.axial).add(basis.axis.clone().multiplyScalar(Math.max(radius*.18,25))),basis,radius,label:params.clockwise?"CW":"CCW"});
    }
    return out;
  }
  function rebuild(){
    clearGroup();clearPreview();const def=activeDefinition();
    if(!def||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup){updatePanel();return false;}
    const descriptors=gripDescriptors(def);if(!descriptors.length)return false;
    const g=new THREE.Group();g.name="TubeBender Array Grips";g.userData={helper:true,objectSelectionHelper:true,arrayGrip:true};
    for(const d of descriptors){
      const p=mmToScene(d.point),s=visualScale(p);
      let h;
      if(d.kind.includes("count"))h=cube(p,0xffd65a,d,s);
      else if(d.kind.includes("direction"))h=cone(p,vec(d.axis),0x5cc8ff,d,s);
      else if(d.kind==="clockwise")h=cube(p,0xff7bd1,d,s);
      else h=sphere(p,d.kind==="radius"?0x70e89b:d.kind==="initial-angle"?0xc89bff:d.kind==="total-angle"?0xff9c5c:0x62d8ff,d,s);
      g.add(h);
      const source=sourceTube(def),origin=source?mmToScene(source.origin):null;
      if(origin&&d.kind!=="clockwise")g.add(line(origin,p,0x6d7f91));
    }
    g.traverse(o=>{o.renderOrder=Math.max(o.renderOrder||0,14000);});pipeGroup.add(g);group=g;updatePanel();
    try{markViewerDirty?.();}catch{}return true;
  }
  function pointerRay(event){
    const c=canvas(),rect=c?.getBoundingClientRect?.();if(!c||!rect?.width||!rect?.height||typeof camera==="undefined"||!camera)return null;
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    const rc=new THREE.Raycaster();rc.setFromCamera(mouse,camera);return rc;
  }
  function pick(event){
    const rc=pointerRay(event);if(!rc||!group)return null;
    for(const hit of rc.intersectObjects(group.children,true)){
      let o=hit.object;while(o){
        if(o.userData?.arrayGripHandle)return {object:o,handle:o.userData.arrayGripHandle,hit};
        o=o.parent;
      }
    }
    return null;
  }
  function planeHit(event,normal,point){
    const rc=pointerRay(event);if(!rc)return null;
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal.clone().normalize(),mmToScene(point));
    const hit=new THREE.Vector3();return rc.ray.intersectPlane(plane,hit)?sceneToMm(hit):null;
  }
  function cameraNormal(){
    const n=new THREE.Vector3(0,0,1);try{camera.getWorldDirection(n);}catch{}return n;
  }
  function angleOnBasis(point,basis){
    const p=vec(point).sub(basis.center).sub(basis.axial);
    return THREE.MathUtils.radToDeg(Math.atan2(p.dot(basis.v),p.dot(basis.u)));
  }
  function patchForDrag(d,current,event){
    const def=activeDefinition(),params=evaluated(def),source=sourceTube(def);if(!def||!source)return null;
    if(d.kind==="step"){
      const value=vec(current).sub(vec(source.origin)).dot(unit(vec(d.axis)));
      return {step:value};
    }
    if(d.kind==="matrix-step"){
      const value=vec(current).sub(vec(source.origin)).dot(unit(vec(d.axis))),steps=[...(params.steps??[0,0,0])];steps[d.index]=value;return {steps};
    }
    if(d.kind==="direction"){
      const direction=vec(current).sub(vec(source.origin));if(direction.lengthSq()<1e-12)return null;direction.normalize();return {direction:{x:direction.x,y:direction.y,z:direction.z}};
    }
    if(d.kind==="matrix-direction"){
      const direction=vec(current).sub(vec(source.origin));if(direction.lengthSq()<1e-12)return null;direction.normalize();
      const directions=clone(params.directions??[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]);directions[d.index]={x:direction.x,y:direction.y,z:direction.z};return {directions};
    }
    if(d.kind==="radius"){
      const p=vec(current).sub(d.basis.center).sub(d.basis.axial),axial=d.basis.axis.clone().multiplyScalar(p.dot(d.basis.axis));
      return {radius_mm:p.sub(axial).length()};
    }
    if(d.kind==="initial-angle"){
      const raw=angleOnBasis(current,d.basis),sign=params.clockwise?-1:1;return {initial_angle_deg:sign*raw};
    }
    if(d.kind==="total-angle"){
      const raw=angleOnBasis(current,d.basis),sign=params.clockwise?-1:1,initial=Number(params.initial_angle_deg)||0;
      return {total_angle_deg:sign*raw-initial};
    }
    if(d.kind.includes("count")){
      const dy=(drag?.startClientY??event.clientY)-event.clientY,start=Math.max(1,Math.trunc(Number(drag?.startValue)||1));
      const count=Math.max(1,start+Math.round(dy/18));
      if(def.type==="Matrix"){
        const counts=[...(params.counts??[1,1,1])];counts[d.index]=count;return {counts};
      }
      return {count};
    }
    return null;
  }
  function preview(def,patch){
    clearPreview();if(!patch)return;
    let data;try{data=arrays()?.previewParameters?.(def.id,patch,{},project());}catch(error){toast(error?.message??error);return;}
    const g=new THREE.Group();g.name="Array Grip Preview";g.userData={helper:true,objectSelectionHelper:true,arrayGripPreview:true};
    for(const member of data.members??[]){
      const p=mmToScene(member.origin),s=visualScale(p);
      const m=new THREE.Mesh(new THREE.SphereGeometry(.045*s,10,8),material(0x59e6ff,.35));m.position.copy(p);m.userData={helper:true,objectSelectionHelper:true,arrayGripPreview:true};g.add(m);
    }
    pipeGroup.add(g);previewGroup=g;
    if(panel){
      const out=panel.querySelector("[data-array-grip-preview]");
      if(out)out.textContent="Preview members: "+String(data.members?.length??0);
    }
    try{markViewerDirty?.();}catch{}
  }
  function commitPatch(def,patch,label="Array grip"){
    if(!patch)return false;
    const command=eng()?.modelCommand;
    const mutate=()=>{arrays()?.updateParameters?.(def.id,patch,{},project());return true;};
    let ok;try{ok=typeof command==="function"?command(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}rebuild();return true;
  }
  function handleCurrentValue(def,d){
    const p=evaluated(def);
    if(d.field==="count")return p.count;
    if(d.field==="step")return p.step;
    if(d.field==="radius_mm")return p.radius_mm;
    if(d.field==="initial_angle_deg")return p.initial_angle_deg;
    if(d.field==="total_angle_deg")return p.total_angle_deg;
    if(d.kind==="matrix-count")return p.counts?.[d.index];
    if(d.kind==="matrix-step")return p.steps?.[d.index];
    return null;
  }
  function begin(event,picked){
    const def=activeDefinition(),d=picked?.handle;if(!def||!d)return false;
    activeHandle=d;updatePanel();
    if(d.kind==="clockwise"){
      const p=evaluated(def);commitPatch(def,{clockwise:!p.clockwise},"Toggle Array CW/CCW");
      suppressUntil=Date.now()+120;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
    }
    const planeNormal=(d.basis?.axis??cameraNormal()),anchor=d.basis?.center??sourceTube(def)?.origin??{x:0,y:0,z:0};
    const start=planeHit(event,vec(planeNormal),anchor);if(!start)return false;
    drag={defId:String(def.id),handle:d,start,startClientY:event.clientY,startValue:handleCurrentValue(def,d),patch:null};
    try{if(controls)controls.enabled=false;}catch{}
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function update(event){
    if(!drag)return false;const def=arrays()?.definitionById?.(drag.defId);if(!def)return false;
    const d=drag.handle,planeNormal=(d.basis?.axis??cameraNormal()),anchor=d.basis?.center??sourceTube(def)?.origin??{x:0,y:0,z:0};
    const current=planeHit(event,vec(planeNormal),anchor);if(!current)return false;
    const patch=patchForDrag(d,current,event);if(!patch)return false;drag.patch=patch;preview(def,patch);setExactFromPatch(def,d,patch);
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();return true;
  }
  function finish(event,{cancel=false}={}){
    if(!drag)return false;const state=drag;drag=null;try{if(controls)controls.enabled=true;}catch{}clearPreview();
    let ok=true;const def=arrays()?.definitionById?.(state.defId);
    if(!cancel&&def&&state.patch)ok=commitPatch(def,state.patch,"3D Array grip");
    suppressUntil=Date.now()+120;rebuild();event?.preventDefault?.();event?.stopPropagation?.();event?.stopImmediatePropagation?.();return ok;
  }
  function setExactFromPatch(def,d,patch){
    const input=panel?.querySelector("[data-array-grip-value]");if(!input)return;
    let value=d.field in patch?patch[d.field]:null;
    if(d.kind==="matrix-count")value=patch.counts?.[d.index];
    if(d.kind==="matrix-step")value=patch.steps?.[d.index];
    if(value!=null&&Number.isFinite(Number(value)))input.value=Number(value).toFixed(d.kind.includes("count")?0:3);
  }
  function exactPatch(def,d,value){
    const p=evaluated(def),n=Number(String(value??"").replace(",","."));
    if(!Number.isFinite(n))throw new Error("Введите числовое значение");
    if(d.kind==="step")return {step:n};
    if(d.kind==="count")return {count:Math.max(1,Math.trunc(n))};
    if(d.kind==="matrix-step"){const steps=[...(p.steps??[0,0,0])];steps[d.index]=n;return {steps};}
    if(d.kind==="matrix-count"){const counts=[...(p.counts??[1,1,1])];counts[d.index]=Math.max(1,Math.trunc(n));return {counts};}
    if(d.kind==="radius")return {radius_mm:Math.max(0,n)};
    if(d.kind==="initial-angle")return {initial_angle_deg:n};
    if(d.kind==="total-angle")return {total_angle_deg:n};
    throw new Error("Для Direction используйте drag grip; CW/CCW переключается отдельной ручкой");
  }
  function applyExact(){
    const def=activeDefinition();if(!def||!activeHandle){toast("Выберите Array grip");return false;}
    try{return commitPatch(def,exactPatch(def,activeHandle,panel?.querySelector("[data-array-grip-value]")?.value),"Exact Array parameter");}
    catch(error){toast(error?.message??error);return false;}
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbArrayGripStyles";style.textContent='#tbArrayGripPanel{position:fixed;left:14px;bottom:188px;z-index:120312;width:330px;padding:8px;border:1px solid #41566f;border-radius:8px;background:rgba(13,22,32,.96);color:#eaf3fd;font:11px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.45);display:none}#tbArrayGripPanel.open{display:block}#tbArrayGripPanel .ag-row{display:flex;gap:6px;align-items:center;margin:5px 0}#tbArrayGripPanel input{width:90px;background:#0a121b;color:#fff;border:1px solid #40536a;border-radius:4px;padding:4px}#tbArrayGripPanel button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:4px 7px;cursor:pointer}#tbArrayGripPanel .ag-grow{flex:1}.ag-muted{color:#8295aa}';document.head.appendChild(style);
    panel=document.createElement("section");panel.id="tbArrayGripPanel";panel.innerHTML='<div class="ag-row"><b>Array Grips</b><span class="ag-grow"></span><span class="ag-muted" data-array-grip-array>—</span></div><div class="ag-row"><span data-array-grip-handle>handle: —</span><span class="ag-grow"></span><span data-array-grip-preview class="ag-muted"></span></div><div class="ag-row"><label>Exact</label><input data-array-grip-value><button data-array-grip-apply>Apply</button><button data-array-grip-edit>Formulas…</button></div>';
    document.body.appendChild(panel);panel.querySelector("[data-array-grip-apply]").onclick=applyExact;
    panel.querySelector("[data-array-grip-edit]").onclick=()=>window.TubeBenderEditing?.open?.("array");
    return panel;
  }
  function updatePanel(){
    ensurePanel();const def=activeDefinition();panel.classList.toggle("open",!!def);
    panel.querySelector("[data-array-grip-array]").textContent=def?String(def.name??def.id):"—";
    panel.querySelector("[data-array-grip-handle]").textContent="handle: "+(activeHandle?.label??"—");
    const input=panel.querySelector("[data-array-grip-value]");
    if(def&&activeHandle){
      const v=handleCurrentValue(def,activeHandle);if(v!=null&&Number.isFinite(Number(v)))input.value=String(v);
      input.disabled=["direction","matrix-direction","clockwise"].includes(activeHandle.kind);
    }else{input.value="";input.disabled=true;}
  }
  function onDown(event){if(event.button!==0||drag)return;const picked=pick(event);if(picked)begin(event,picked);}
  function onMove(event){if(drag)update(event);}
  function onUp(event){if(drag)finish(event);}
  function onClick(event){if(Date.now()<suppressUntil){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();}}
  function onKey(event){if(event.key==="Escape"&&drag)finish(event,{cancel:true});}
  function selectionChanged(){if(drag)return;activeHandle=null;rebuild();}
  function install(){
    if(installed)return;installed=true;ensurePanel();
    canvas()?.addEventListener("pointerdown",onDown,true);window.addEventListener("pointermove",onMove,true);window.addEventListener("pointerup",onUp,true);canvas()?.addEventListener("click",onClick,true);window.addEventListener("keydown",onKey,true);
    window.addEventListener("tubebender-selection-change",selectionChanged);window.addEventListener("tubebender-layer-change",rebuild);window.addEventListener("tubebender-lock-change",rebuild);window.addEventListener("tubebender-array-change",()=>{if(!drag)rebuild();});
    if(typeof renderAll==="function"&&!renderAll._tbArrayGrips){const original=renderAll;renderAll=function(...args){const result=original.apply(this,args);try{rebuild();}catch{}return result;};renderAll._tbArrayGrips=true;}
    rebuild();window.TubeBenderArrayGrips=Object.freeze({rebuild,activeDefinition,applyExact});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();