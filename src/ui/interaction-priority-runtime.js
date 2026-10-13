(()=>{
  const DEFAULT_MOUSE_THRESHOLD=4;
  const DEFAULT_PEN_THRESHOLD=7;
  const DEFAULT_TOUCH_THRESHOLD=12;
  let installed=false;
  const canvas=()=>document.getElementById("threeCanvas");
  function threshold(pointerType="mouse"){
    const type=String(pointerType||"mouse");
    return type==="touch"?DEFAULT_TOUCH_THRESHOLD:type==="pen"?DEFAULT_PEN_THRESHOLD:DEFAULT_MOUSE_THRESHOLD;
  }
  function movementExceeded(start,event){
    if(!start||!event)return false;
    const dx=Number(event.clientX)-Number(start.x),dy=Number(event.clientY)-Number(start.y);
    const limit=Number(start.threshold_px??threshold(start.pointerType??event.pointerType));
    return Number.isFinite(dx)&&Number.isFinite(dy)&&Math.hypot(dx,dy)>limit;
  }
  function handleInfo(object){
    let item=object;
    while(item){
      const data=item.userData??{};
      if(data.transformGizmoHandle)return {owner:"gizmo",priority:100,handle:data.transformGizmoHandle,object:item};
      if(data.geometryGrip)return {owner:"geometry-grip",priority:90,handle:data.geometryGrip,object:item};
      if(data.arrayGripHandle)return {owner:"array-grip",priority:90,handle:data.arrayGripHandle,object:item};
      if(data.dimensionGrip)return {owner:"dimension-grip",priority:90,handle:{kind:data.dimensionGrip,dimensionId:data.dimensionId},object:item};
      item=item.parent;
    }
    return null;
  }
  function pointerRay(event){
    if(typeof THREE==="undefined"||typeof camera==="undefined"||typeof pipeGroup==="undefined"||!camera||!pipeGroup)return null;
    const c=canvas(),rect=c?.getBoundingClientRect?.();if(!rect?.width||!rect?.height)return null;
    const pointer=new THREE.Vector2(
      ((Number(event.clientX)-rect.left)/rect.width)*2-1,
      -((Number(event.clientY)-rect.top)/rect.height)*2+1
    );
    const raycaster=new THREE.Raycaster();raycaster.params.Line={threshold:.18};raycaster.setFromCamera(pointer,camera);
    return raycaster;
  }
  function editHandleAt(event){
    const raycaster=pointerRay(event);if(!raycaster)return null;
    const candidates=[];
    for(const hit of raycaster.intersectObjects(pipeGroup.children,true)){
      const info=handleInfo(hit.object);if(info)candidates.push({...info,distance:Number(hit.distance)||0});
    }
    candidates.sort((a,b)=>b.priority-a.priority||a.distance-b.distance);
    return candidates[0]??null;
  }
  function shouldOrbitStart(event){
    if(!event)return true;
    if(event.pointerType==="mouse"){
      const button=Number(event.button);
      if(button===2)return false;
      if(button===1)return true;
      if(button!==0)return false;
    }
    return !editHandleAt(event);
  }
  function cancelActiveInteraction(reason="escape"){
    try{if(typeof controls!=="undefined")controls?.cancelGesture?.();}catch{}
    try{window.dispatchEvent(new CustomEvent("tubebender-interaction-cancel",{detail:{reason:String(reason)}}));}catch{}
    return true;
  }
  function onKey(event){
    if(event.key==="Escape")cancelActiveInteraction("escape");
  }
  function install(){
    if(installed)return;installed=true;
    window.addEventListener("keydown",onKey,true);
    window.TubeBenderInteractionPriority=Object.freeze({
      editHandleAt,shouldOrbitStart,movementExceeded,
      dragThresholdPx:threshold,cancelActiveInteraction,
      priorities:Object.freeze({gizmo:100,grip:90,orbit:10,selection:1})
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();