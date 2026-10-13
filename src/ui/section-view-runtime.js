(()=>{
  const SECTION_URL="__TB_SECTION_VIEW_MODULE_URL__";
  const SECTION_DERIVED_URL="__TB_SECTION_DERIVED_MODULE_URL__";
  let domain=null,derived=null,installed=false,panel=null,toggle=null,helperGroup=null,selectionOverlay=null;
  const derivedSelectionRegistry=new Map();
  const eng=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const sceneScale=()=>typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function command(label,mutate){
    const fn=eng()?.modelCommand;let ok;
    try{ok=typeof fn==="function"?fn(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();}catch{}
    apply();renderPanel();dispatch();return true;
  }
  function current(){return domain.ensureSectionViewState(project());}
  function planeToThree(input){
    if(typeof THREE==="undefined")return null;
    let n=new THREE.Vector3(input.normal.x,input.normal.y,input.normal.z).normalize();
    if(input.flipped)n.multiplyScalar(-1);
    const scale=sceneScale(),p=new THREE.Vector3(input.point.x*scale,input.point.y*scale,input.point.z*scale);
    return new THREE.Plane().setFromNormalAndCoplanarPoint(n,p);
  }
  function boxToPlanes(box){
    if(typeof THREE==="undefined")return [];
    const {min,max}=box,scale=sceneScale();
    return [
      new THREE.Plane(new THREE.Vector3( 1,0,0),-min.x*scale),
      new THREE.Plane(new THREE.Vector3(-1,0,0), max.x*scale),
      new THREE.Plane(new THREE.Vector3(0, 1,0),-min.y*scale),
      new THREE.Plane(new THREE.Vector3(0,-1,0), max.y*scale),
      new THREE.Plane(new THREE.Vector3(0,0, 1),-min.z*scale),
      new THREE.Plane(new THREE.Vector3(0,0,-1), max.z*scale)
    ];
  }
  function clearSelectionOverlay(){
    if(!selectionOverlay)return;
    try{selectionOverlay.parent?.remove(selectionOverlay);}catch{}
    try{selectionOverlay.traverse(obj=>{obj.geometry?.dispose?.();if(Array.isArray(obj.material))obj.material.forEach(m=>m?.dispose?.());else obj.material?.dispose?.();});}catch{}
    selectionOverlay=null;
  }
  function renderSelectionOverlay(entries=null){
    clearSelectionOverlay();
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return false;
    const selectedEntries=Array.isArray(entries)?entries:(window.TubeBenderObjectContext?.selectionEntries?.()??[]);
    const records=selectedEntries
      .filter(entry=>entry?.kind==="section-derived")
      .map(entry=>derivedSelectionById(entry.derivedId))
      .filter(record=>record?.segment?.start&&record?.segment?.end);
    if(!records.length){try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}return false;}
    const scale=sceneScale(),group=new THREE.Group();group.id="tbSectionDerivedSelectionOverlay";
    group.userData={helper:true,objectSelectionHelper:true,sectionDerivedSelection:true};
    for(const record of records){
      const a=record.segment.start,b=record.segment.end;
      const points=[new THREE.Vector3(a.x*scale,a.y*scale,a.z*scale),new THREE.Vector3(b.x*scale,b.y*scale,b.z*scale)];
      const line=new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({depthTest:false,depthWrite:false})
      );
      line.renderOrder=11940;line.userData={helper:true,objectSelectionHelper:true,sectionDerivedSelection:true,derivedId:record.id};group.add(line);
      for(const p of points){
        const marker=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.025,2.5*scale),10,7),new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false}));
        marker.position.copy(p);marker.renderOrder=11941;marker.userData={helper:true,objectSelectionHelper:true,sectionDerivedSelection:true,derivedId:record.id};group.add(marker);
      }
    }
    pipeGroup.add(group);selectionOverlay=group;
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
    return true;
  }
  function clearHelper(){
    if(!helperGroup)return;
    try{helperGroup.parent?.remove(helperGroup);}catch{}
    try{helperGroup.traverse(obj=>{obj.geometry?.dispose?.();if(Array.isArray(obj.material))obj.material.forEach(m=>m?.dispose?.());else obj.material?.dispose?.();});}catch{}
    helperGroup=null;
  }
  function modelCenterAndSize(){
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return {center:new THREE.Vector3(),size:new THREE.Vector3(10,10,10)};
    const box=new THREE.Box3().setFromObject(pipeGroup);
    if(box.isEmpty())return {center:new THREE.Vector3(),size:new THREE.Vector3(10,10,10)};
    return {center:box.getCenter(new THREE.Vector3()),size:box.getSize(new THREE.Vector3())};
  }
  function buildHelper(state){
    clearHelper();
    if(!state.enabled||!state.show_helper||typeof THREE==="undefined"||typeof scene==="undefined"||!scene)return;
    helperGroup=new THREE.Group();helperGroup.userData={helper:true,sectionHelper:true};
    if(state.mode==="plane"){
      const {center,size}=modelCenterAndSize(),normal=new THREE.Vector3(state.plane.normal.x,state.plane.normal.y,state.plane.normal.z).normalize();
      if(state.plane.flipped)normal.multiplyScalar(-1);
      const span=Math.max(size.x,size.y,size.z,1)*1.25,scale=sceneScale();
      const geo=new THREE.PlaneGeometry(span,span);
      const mat=new THREE.MeshBasicMaterial({transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
      const mesh=new THREE.Mesh(geo,mat);
      mesh.position.set(state.plane.point.x*scale,state.plane.point.y*scale,state.plane.point.z*scale);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
      mesh.userData={helper:true,sectionHelper:true};
      helperGroup.add(mesh);
      const arrow=new THREE.ArrowHelper(normal,new THREE.Vector3(state.plane.point.x*scale,state.plane.point.y*scale,state.plane.point.z*scale),Math.max(.5,span*.15));
      arrow.userData={helper:true,sectionHelper:true};helperGroup.add(arrow);
    }else if(state.mode==="box"){
      const scale=sceneScale(),min=new THREE.Vector3(state.box.min.x*scale,state.box.min.y*scale,state.box.min.z*scale),max=new THREE.Vector3(state.box.max.x*scale,state.box.max.y*scale,state.box.max.z*scale);
      const box=new THREE.Box3(min,max),helper=new THREE.Box3Helper(box);
      helper.userData={helper:true,sectionHelper:true};helperGroup.add(helper);
    }
    scene.add(helperGroup);
  }
  function apply(){
    if(!domain||typeof renderer==="undefined"||!renderer)return false;
    const state=current();
    renderer.localClippingEnabled=true;
    renderer.clippingPlanes=!state.enabled||state.mode==="off"
      ?[]
      :state.mode==="plane"
        ?[planeToThree(state.plane)].filter(Boolean)
        :boxToPlanes(state.box);
    buildHelper(state);
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
    return true;
  }
  function setPlane(plane,options={}){return command("Section Plane",()=>{domain.setSectionPlane(project(),plane,options);return true;});}
  function setBox(box,options={}){return command("Section Box",()=>{domain.setSectionBox(project(),box,options);return true;});}
  function disable(){return command("Отключить Section View",()=>{domain.disableSectionView(project());return true;});}
  function flipPlane(){
    const state=current();if(state.mode!=="plane")return false;
    return setPlane({...state.plane,flipped:!state.plane.flipped},{enabled:true,show_helper:state.show_helper});
  }
  function setHelper(visible){
    const state=current();
    return command("Section helper",()=>{
      project().section_view={...state,show_helper:visible===true};return true;
    });
  }
  function capture(){return domain.sectionViewSnapshot(project());}
  function restore(snapshot,{recordHistory=false}={}){
    const mutate=()=>{project().section_view={...domain.normalizeSectionView(snapshot??{})};return true;};
    if(recordHistory)return command("Восстановить Section View",mutate);
    mutate();apply();renderPanel();renderSelectionOverlay();dispatch();return true;
  }
  function parseVec(text,fallback){
    const parts=String(text??"").replace(/,/g,".").split(";").map(Number);
    return {
      x:Number.isFinite(parts[0])?parts[0]:fallback.x,
      y:Number.isFinite(parts[1])?parts[1]:fallback.y,
      z:Number.isFinite(parts[2])?parts[2]:fallback.z
    };
  }

  function screenDistance(point,event,canvas){
    if(!point||!event||!canvas||typeof camera==="undefined"||!camera||typeof THREE==="undefined")return 0;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return 0;
    const scale=sceneScale(),v=new THREE.Vector3(point.x*scale,point.y*scale,point.z*scale).project(camera);
    const sx=rect.left+(v.x+1)*.5*rect.width,sy=rect.top+(1-v.y)*.5*rect.height;
    return Math.hypot(Number(event.clientX)-sx,Number(event.clientY)-sy);
  }
  function sourceForObject(object){
    let item=object,source="Editable",objectId=object?.uuid??"section-object";
    while(item){
      const data=item.userData??{};
      if(data.referenceEditableInstanceId){source="MeshFitted";objectId=String(data.referenceEditableInstanceId);break;}
      if(data.referenceNodeId&&data.referenceSceneId){source="SourceReference";objectId=String(data.referenceSceneId)+":"+String(data.referenceNodeId);break;}
      if(data.constructionId||data.constructionGeometryId){source="Construction";objectId=String(data.constructionId??data.constructionGeometryId);}
      if(data.tubeId){source="Tube";objectId=String(data.tubeId);}
      item=item.parent;
    }
    return {source,objectId};
  }
  function triangleFromHit(hit){
    const geometry=hit?.object?.geometry,position=geometry?.attributes?.position,face=hit?.face;
    if(!position||!face)return null;
    const scale=sceneScale(),out=[];
    for(const index of [face.a,face.b,face.c]){
      if(!Number.isInteger(index)||index<0||index>=position.count)return null;
      const world=new THREE.Vector3().fromBufferAttribute(position,index);
      hit.object.localToWorld(world);
      out.push({x:world.x/scale,y:world.y/scale,z:world.z/scale});
    }
    return out;
  }
  function candidate(id,type,point,event,canvas,{source,objectId,segment,face,index}={}){
    return Object.freeze({
      id:String(id),type:String(type),source:"SectionDerived",
      object_id:String(objectId??"section"),subentity_id:"section:"+String(face??"plane")+":"+String(index??0),
      point:{x:Number(point.x),y:Number(point.y),z:Number(point.z)},
      screen_distance_px:screenDistance(point,event,canvas),
      visible:true,virtual:true,through:false,fitted:false,
      geometry_status:"SectionDerived",fitting_error:{mm:0,deg:0},confidence:1,
      evidence:[{kind:"SectionDerived",source_geometry:String(source??"Editable"),section_face:String(face??"plane")}],
      label:"Section-derived "+type,
      metadata:{
        section_derived:true,section_mode:String(current().mode),section_face:String(face??"plane"),
        source_geometry:String(source??"Editable"),
        primitive:segment?{kind:"segment",start:{...segment[0]},end:{...segment[1]}}:null
      }
    });
  }
  function segmentScreenDistance(segment,event,canvas){
    if(!segment||!event||!canvas||typeof camera==="undefined"||!camera||typeof THREE==="undefined")return Infinity;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return Infinity;
    const scale=sceneScale();
    const projectPoint=(p)=>{
      const v=new THREE.Vector3(p.x*scale,p.y*scale,p.z*scale).project(camera);
      return {x:rect.left+(v.x+1)*.5*rect.width,y:rect.top+(1-v.y)*.5*rect.height};
    };
    const a=projectPoint(segment[0]),b=projectPoint(segment[1]),px=Number(event.clientX),py=Number(event.clientY);
    const vx=b.x-a.x,vy=b.y-a.y,den=vx*vx+vy*vy;
    const u=den>1e-12?Math.max(0,Math.min(1,((px-a.x)*vx+(py-a.y)*vy)/den)):0;
    return Math.hypot(px-(a.x+u*vx),py-(a.y+u*vy));
  }
  function rememberDerivedSelection(record){
    if(!record?.id)return null;
    derivedSelectionRegistry.set(String(record.id),Object.freeze(structuredClone(record)));
    if(derivedSelectionRegistry.size>256){
      const first=derivedSelectionRegistry.keys().next().value;
      if(first!=null)derivedSelectionRegistry.delete(first);
    }
    return record;
  }
  function selectionRecord(id,segment,event,canvas,{source,objectId,face,index}={}){
    const mid={x:(segment[0].x+segment[1].x)/2,y:(segment[0].y+segment[1].y)/2,z:(segment[0].z+segment[1].z)/2};
    const record={
      id:String(id),kind:"section-derived",virtual:true,readonly:true,
      source:"SectionDerived",source_geometry:String(source??"Editable"),
      object_id:String(objectId??"section"),subentity_id:"section:"+String(face??"plane")+":"+String(index??0),
      section_mode:String(current().mode),section_face:String(face??"plane"),
      segment:{start:{...segment[0]},end:{...segment[1]},midpoint:mid},
      screen_distance_px:segmentScreenDistance(segment,event,canvas),
      geometry_status:"SectionDerived",
      evidence:[{kind:"SectionDerived",source_geometry:String(source??"Editable"),section_face:String(face??"plane")}]
    };
    return rememberDerivedSelection(record);
  }
  function selectionCandidatesAtEvent(event,{thresholdPx=10}={}){
    const state=current();
    if(!state.enabled||state.mode==="off"||!derived||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup||typeof camera==="undefined"||!camera)return Object.freeze([]);
    const canvas=document.getElementById("threeCanvas"),rect=canvas?.getBoundingClientRect?.();
    if(!canvas||!rect?.width||!rect?.height)return Object.freeze([]);
    const raycaster=new THREE.Raycaster();
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObjects(pipeGroup.children,true),records=[],seen=new Set();
    for(const hit of hits){
      if(records.length>=24)break;
      if(hit.object?.userData?.helper||hit.object?.userData?.hitProxy||hit.object?.visible===false)continue;
      const triangle=triangleFromHit(hit);if(!triangle)continue;
      const segments=derived.sectionSegmentsFromTriangles([triangle],state),src=sourceForObject(hit.object);
      segments.forEach((item,segmentIndex)=>{
        const id="section:"+src.objectId+":"+String(item.face)+":"+String(hit.faceIndex??segmentIndex)+":segment";
        if(seen.has(id))return;seen.add(id);
        const record=selectionRecord(id,item.segment,event,canvas,{...src,face:item.face,index:segmentIndex});
        if(record.screen_distance_px<=thresholdPx)records.push(record);
      });
    }
    records.sort((a,b)=>a.screen_distance_px-b.screen_distance_px);
    return Object.freeze(records);
  }
  function derivedSelectionById(id){return derivedSelectionRegistry.get(String(id??""))??null;}

  function snapCandidatesAtEvent(event){
    const state=current();
    if(!state.enabled||state.mode==="off"||!derived||typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup||typeof camera==="undefined"||!camera)return Object.freeze([]);
    const canvas=document.getElementById("threeCanvas"),rect=canvas?.getBoundingClientRect?.();
    if(!canvas||!rect?.width||!rect?.height)return Object.freeze([]);
    const raycaster=new THREE.Raycaster();
    const mouse=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObjects(pipeGroup.children,true),records=[],seen=new Set();
    const add=record=>{if(record&&!seen.has(record.id)){seen.add(record.id);records.push(record);}};
    for(const hit of hits){
      if(records.length>=18)break;
      if(hit.object?.userData?.helper||hit.object?.userData?.hitProxy||hit.object?.visible===false)continue;
      const triangle=triangleFromHit(hit);if(!triangle)continue;
      const segments=derived.sectionSegmentsFromTriangles([triangle],state);
      const src=sourceForObject(hit.object);
      segments.forEach((item,segmentIndex)=>{
        const segment=item.segment,a=segment[0],b=segment[1],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2};
        const base="section:"+src.objectId+":"+String(item.face)+":"+String(hit.faceIndex??segmentIndex);
        add(candidate(base+":a","Endpoint",a,event,canvas,{...src,segment,face:item.face,index:segmentIndex}));
        add(candidate(base+":m","Midpoint",mid,event,canvas,{...src,segment,face:item.face,index:segmentIndex}));
        add(candidate(base+":b","Endpoint",b,event,canvas,{...src,segment,face:item.face,index:segmentIndex}));
        add(candidate(base+":axis","LineAxis",mid,event,canvas,{...src,segment,face:item.face,index:segmentIndex}));
      });
    }
    return Object.freeze(records);
  }

  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbSectionStyles";style.textContent=
      '#tbSectionToggle{position:fixed;right:638px;top:54px;z-index:120374;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbSectionPanel{position:fixed;right:14px;top:88px;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120367;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbSectionPanel.open{display:flex}.tb-sec-head{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid #304154}.tb-sec-head .grow{flex:1}.tb-sec-body{padding:8px;overflow:auto}.tb-sec-grid{display:grid;grid-template-columns:120px 1fr;gap:7px;align-items:center}.tb-sec-grid input,.tb-sec-grid select{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-sec-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.tb-sec-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 7px;cursor:pointer}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbSectionToggle";toggle.type="button";toggle.textContent="Section";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbSectionPanel";panel.innerHTML='<div class="tb-sec-head"><b>Section View</b><span class="grow"></span><button data-sec-close>×</button></div><div class="tb-sec-body" data-sec-body></div>';document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderPanel();};panel.querySelector("[data-sec-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function renderPanel(){
    if(!domain)return;const state=current(),root=ensurePanel(),body=root.querySelector("[data-sec-body]");
    body.innerHTML='<div class="tb-sec-grid"><label>Mode</label><select data-sec-mode><option value="off" '+(state.mode==="off"?"selected":"")+'>Off</option><option value="plane" '+(state.mode==="plane"?"selected":"")+'>Section Plane</option><option value="box" '+(state.mode==="box"?"selected":"")+'>Section Box</option></select><label>Plane point XYZ</label><input data-sec-point value="'+esc([state.plane.point.x,state.plane.point.y,state.plane.point.z].join(";"))+'"><label>Plane normal XYZ</label><input data-sec-normal value="'+esc([state.plane.normal.x,state.plane.normal.y,state.plane.normal.z].join(";"))+'"><label>Box min XYZ</label><input data-sec-min value="'+esc([state.box.min.x,state.box.min.y,state.box.min.z].join(";"))+'"><label>Box max XYZ</label><input data-sec-max value="'+esc([state.box.max.x,state.box.max.y,state.box.max.z].join(";"))+'"><label>Helper</label><input data-sec-helper type="checkbox" '+(state.show_helper?"checked":"")+'></div><div class="tb-sec-actions"><button data-sec-apply>Apply</button><button data-sec-flip '+(state.mode!=="plane"?"disabled":"")+'>Flip Plane</button><button data-sec-off>Off</button></div>';
    body.querySelector("[data-sec-apply]").onclick=()=>{
      const mode=body.querySelector("[data-sec-mode]").value,show=body.querySelector("[data-sec-helper]").checked;
      if(mode==="plane")setPlane({point:parseVec(body.querySelector("[data-sec-point]").value,state.plane.point),normal:parseVec(body.querySelector("[data-sec-normal]").value,state.plane.normal),flipped:state.plane.flipped},{enabled:true,show_helper:show});
      else if(mode==="box")setBox({min:parseVec(body.querySelector("[data-sec-min]").value,state.box.min),max:parseVec(body.querySelector("[data-sec-max]").value,state.box.max)},{enabled:true,show_helper:show});
      else disable();
    };
    body.querySelector("[data-sec-flip]").onclick=flipPlane;
    body.querySelector("[data-sec-off]").onclick=disable;
    body.querySelector("[data-sec-helper]").onchange=e=>setHelper(e.target.checked);
  }
  function invalidateDerivedSelections(){
    derivedSelectionRegistry.clear();clearSelectionOverlay();
    const context=window.TubeBenderObjectContext;
    const keys=context?.selectionKeys?.()??[];
    const kept=keys.filter(key=>context?.parseSelectionKey?.(key)?.kind!=="section-derived");
    if(kept.length!==keys.length)context?.replaceSelectionKeys?.(kept,{announce:true});
  }
  function dispatch(){
    invalidateDerivedSelections();
    try{window.dispatchEvent(new CustomEvent("tubebender-section-view-change",{detail:{state:capture()}}));}catch{}
  }
  async function install(){
    if(installed)return;installed=true;
    try{[domain,derived]=await Promise.all([import(SECTION_URL),import(SECTION_DERIVED_URL)]);}catch(error){console.error("Section View failed",error);return;}
    domain.ensureSectionViewState(project());ensurePanel();renderPanel();apply();
    window.addEventListener("tubebender-selection-change",(event)=>renderSelectionOverlay(event?.detail?.entries));
    window.addEventListener("tubebender-section-view-change",()=>renderSelectionOverlay());
    window.TubeBenderSectionView=Object.freeze({setPlane,setBox,disable,flipPlane,setHelper,capture,restore,apply,snapCandidatesAtEvent,selectionCandidatesAtEvent,derivedSelectionById,renderSelectionOverlay,openPanel:()=>{ensurePanel().classList.add("open");renderPanel();},domain,derived});
    dispatch();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();