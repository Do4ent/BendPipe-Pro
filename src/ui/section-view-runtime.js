(()=>{
  const SECTION_URL="__TB_SECTION_VIEW_MODULE_URL__";
  let domain=null,installed=false,panel=null,toggle=null,helperGroup=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};
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
    const p=new THREE.Vector3(input.point.x,input.point.y,input.point.z);
    return new THREE.Plane().setFromNormalAndCoplanarPoint(n,p);
  }
  function boxToPlanes(box){
    if(typeof THREE==="undefined")return [];
    const {min,max}=box;
    return [
      new THREE.Plane(new THREE.Vector3( 1,0,0),-min.x),
      new THREE.Plane(new THREE.Vector3(-1,0,0), max.x),
      new THREE.Plane(new THREE.Vector3(0, 1,0),-min.y),
      new THREE.Plane(new THREE.Vector3(0,-1,0), max.y),
      new THREE.Plane(new THREE.Vector3(0,0, 1),-min.z),
      new THREE.Plane(new THREE.Vector3(0,0,-1), max.z)
    ];
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
      const span=Math.max(size.x,size.y,size.z,1)*1.25;
      const geo=new THREE.PlaneGeometry(span,span);
      const mat=new THREE.MeshBasicMaterial({transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
      const mesh=new THREE.Mesh(geo,mat);
      mesh.position.set(state.plane.point.x,state.plane.point.y,state.plane.point.z);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
      mesh.userData={helper:true,sectionHelper:true};
      helperGroup.add(mesh);
      const arrow=new THREE.ArrowHelper(normal,new THREE.Vector3(state.plane.point.x,state.plane.point.y,state.plane.point.z),Math.max(.5,span*.15));
      arrow.userData={helper:true,sectionHelper:true};helperGroup.add(arrow);
    }else if(state.mode==="box"){
      const min=new THREE.Vector3(state.box.min.x,state.box.min.y,state.box.min.z),max=new THREE.Vector3(state.box.max.x,state.box.max.y,state.box.max.z);
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
    mutate();apply();renderPanel();dispatch();return true;
  }
  function parseVec(text,fallback){
    const parts=String(text??"").replace(/,/g,".").split(";").map(Number);
    return {
      x:Number.isFinite(parts[0])?parts[0]:fallback.x,
      y:Number.isFinite(parts[1])?parts[1]:fallback.y,
      z:Number.isFinite(parts[2])?parts[2]:fallback.z
    };
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
  function dispatch(){try{window.dispatchEvent(new CustomEvent("tubebender-section-view-change",{detail:{state:capture()}}));}catch{}}
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(SECTION_URL);}catch(error){console.error("Section View failed",error);return;}
    domain.ensureSectionViewState(project());ensurePanel();renderPanel();apply();
    window.TubeBenderSectionView=Object.freeze({setPlane,setBox,disable,flipPlane,setHelper,capture,restore,apply,openPanel:()=>{ensurePanel().classList.add("open");renderPanel();},domain});
    dispatch();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();