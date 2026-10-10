(()=>{
  const STORAGE_KEY="tubebender.screenSpaceMarkers.v1";
  const DEFAULTS=Object.freeze({
    grip_px:8,
    array_grip_px:8,
    snap_px:7,
    constraint_px:7,
    dimension_grip_px:8,
    dimension_text_px:14
  });
  let installed=false,panel=null,toggle=null,constraintGroup=null,raf=0;
  const registry=new Set();
  const eng=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const activeTube=()=>{try{return eng()?.activeTube?.()??null;}catch{return null;}};
  const canvas=()=>document.getElementById("threeCanvas");
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  function load(){
    let raw={};try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")??{};}catch{}
    return {
      grip_px:clamp(raw.grip_px??DEFAULTS.grip_px,3,30),
      array_grip_px:clamp(raw.array_grip_px??DEFAULTS.array_grip_px,3,30),
      snap_px:clamp(raw.snap_px??DEFAULTS.snap_px,3,30),
      constraint_px:clamp(raw.constraint_px??DEFAULTS.constraint_px,3,30),
      dimension_grip_px:clamp(raw.dimension_grip_px??DEFAULTS.dimension_grip_px,3,30),
      dimension_text_px:clamp(raw.dimension_text_px??DEFAULTS.dimension_text_px,6,48)
    };
  }
  let settings=load();
  function save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}
    try{window.dispatchEvent(new CustomEvent("tubebender-screen-space-change",{detail:{...settings}}));}catch{}
  }
  function categoryPixels(category){
    const key={
      grip:"grip_px",
      array:"array_grip_px",
      snap:"snap_px",
      constraint:"constraint_px",
      dimension:"dimension_grip_px",
      "dimension-text":"dimension_text_px"
    }[String(category)]??"grip_px";
    return Number(settings[key]??DEFAULTS[key])||8;
  }
  function worldPoint(localPoint){
    if(!localPoint||typeof THREE==="undefined")return null;
    const p=localPoint.isVector3?localPoint.clone():new THREE.Vector3(Number(localPoint.x)||0,Number(localPoint.y)||0,Number(localPoint.z)||0);
    try{if(typeof pipeGroup!=="undefined"&&pipeGroup?.localToWorld)pipeGroup.localToWorld(p);}catch{}
    return p;
  }
  function worldUnitsPerPixel(localPoint){
    if(typeof camera==="undefined"||!camera)return .01;
    const el=canvas(),height=Math.max(1,Number(el?.clientHeight||el?.getBoundingClientRect?.().height||window.innerHeight||800));
    if(camera.isOrthographicCamera){
      const span=Math.abs(Number(camera.top)-Number(camera.bottom))/Math.max(1e-9,Number(camera.zoom)||1);
      return Math.max(1e-9,span/height);
    }
    const world=worldPoint(localPoint);if(!world)return .01;
    const distance=Math.max(1e-9,camera.position.distanceTo(world));
    const fov=(Number(camera.fov)||45)*Math.PI/180;
    return Math.max(1e-9,(2*distance*Math.tan(fov/2))/height);
  }
  function sizeAt(localPoint,category="grip",pixels=null){
    return worldUnitsPerPixel(localPoint)*Math.max(1,Number(pixels??categoryPixels(category))||1);
  }
  function register(object,category="grip",baseSize=1,options={}){
    if(!object||typeof object!=="object")return object;
    object.userData={...(object.userData??{}),tbScreenSpace:{category:String(category),baseSize:Math.max(1e-9,Number(baseSize)||1),mode:String(options.mode??"uniform"),aspect:Math.max(1e-9,Number(options.aspect)||1),multiplier:Math.max(.1,Number(options.multiplier)||1)}};
    registry.add(object);updateObject(object);return object;
  }
  function unregister(object){registry.delete(object);return object;}
  function updateObject(object){
    const meta=object?.userData?.tbScreenSpace;if(!meta)return false;
    if(!object.parent)return false;
    const desired=sizeAt(object.position,meta.category)*Math.max(.1,Number(meta.multiplier)||1),factor=desired/Math.max(1e-9,Number(meta.baseSize)||1);
    if(!Number.isFinite(factor)||factor<=0)return false;
    if(meta.mode==="sprite")object.scale.set(factor*meta.aspect,factor,1);
    else object.scale.setScalar(factor);
    return true;
  }
  function tick(){
    for(const object of [...registry])updateObject(object);
    raf=requestAnimationFrame(tick);
  }
  function constraintPoint(element){
    if(!element)return null;
    if(element.type==="LINE"&&element.start&&element.end)return element.start.clone().add(element.end).multiplyScalar(.5);
    if(element.type==="BEND"&&element.center&&element.start&&element.axis){
      const radial=element.start.clone().sub(element.center),sweep=THREE.MathUtils.degToRad(Math.abs(Number(element.angleDeg)||0))*.5;
      return element.center.clone().add(radial.applyAxisAngle(element.axis.clone().normalize(),sweep));
    }
    return element.start?.clone?.()??element.end?.clone?.()??null;
  }
  function clearConstraints(){
    if(constraintGroup?.parent)constraintGroup.parent.remove(constraintGroup);
    constraintGroup=null;
  }
  function rebuildConstraints(){
    clearConstraints();
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return false;
    const tube=activeTube(),constraints=tube?.engineering?.constraints??[];
    if(!tube||!constraints.length)return false;
    let geometry;try{geometry=eng()?.geometryForTube?.(tube);}catch{return false;}
    if(!geometry)return false;
    const group=new THREE.Group();group.name="Constraint Markers";group.userData={helper:true,objectSelectionHelper:true,constraintMarkers:true};
    for(const constraint of constraints){
      if(constraint?.enabled===false)continue;
      const element=(geometry.elements??[]).find(item=>String(item?.id)===String(constraint.a));
      const point=constraintPoint(element);if(!point)continue;
      const color=constraint.lastStatus==="conflict"?0xff6464:constraint.driving===false?0xb6c0cc:0x74d9ff;
      const marker=new THREE.Mesh(
        new THREE.OctahedronGeometry(1,0),
        new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,transparent:true,opacity:.95})
      );
      marker.position.copy(point);marker.renderOrder=13620;
      marker.userData={helper:true,objectSelectionHelper:true,constraintMarker:true,constraintId:String(constraint.id??"")};
      group.add(marker);register(marker,"constraint",1);
    }
    if(group.children.length){pipeGroup.add(group);constraintGroup=group;}
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
    return group.children.length>0;
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbScreenSpaceStyles";
    style.textContent='#tbMarkerSizeToggle{position:fixed;right:242px;top:54px;z-index:120366;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbMarkerSizePanel{position:fixed;right:14px;top:88px;width:310px;z-index:120365;display:none;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);padding:9px;font:12px system-ui}#tbMarkerSizePanel.open{display:block}.tb-marker-grid{display:grid;grid-template-columns:1fr 74px;gap:7px;align-items:center}.tb-marker-grid input{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:4px}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbMarkerSizeToggle";toggle.textContent="Markers";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbMarkerSizePanel";
    panel.innerHTML='<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><b>Screen-space marker size</b><span style="flex:1"></span><button data-marker-close>×</button></div><div class="tb-marker-grid">'+
      '<label>Geometry grips, px</label><input type="number" min="3" max="30" data-marker-setting="grip_px">'+
      '<label>Array grips, px</label><input type="number" min="3" max="30" data-marker-setting="array_grip_px">'+
      '<label>Snap markers, px</label><input type="number" min="3" max="30" data-marker-setting="snap_px">'+
      '<label>Constraints, px</label><input type="number" min="3" max="30" data-marker-setting="constraint_px">'+
      '<label>Dimension grips, px</label><input type="number" min="3" max="30" data-marker-setting="dimension_grip_px">'+
      '<label>Dimension text, px</label><input type="number" min="6" max="48" data-marker-setting="dimension_text_px">'+
      '</div>';
    document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderPanel();};
    panel.querySelector("[data-marker-close]").onclick=()=>panel.classList.remove("open");
    panel.querySelectorAll("[data-marker-setting]").forEach(input=>input.onchange=()=>{
      const key=input.dataset.markerSetting,min=key==="dimension_text_px"?6:3,max=key==="dimension_text_px"?48:30;
      settings={...settings,[key]:clamp(input.value,min,max)};save();renderPanel();rebuildConstraints();
    });
    return panel;
  }
  function renderPanel(){
    ensurePanel();
    panel.querySelectorAll("[data-marker-setting]").forEach(input=>input.value=String(settings[input.dataset.markerSetting]??""));
  }
  function install(){
    if(installed)return;installed=true;ensurePanel();renderPanel();rebuildConstraints();
    window.addEventListener("tubebender-constraint-change",rebuildConstraints);
    window.addEventListener("tubebender-geometry-grip-change",rebuildConstraints);
    window.addEventListener("tubebender-selection-change",rebuildConstraints);
    window.addEventListener("tubebender-screen-space-change",()=>{for(const object of registry)updateObject(object);});
    if(!raf)raf=requestAnimationFrame(tick);
    window.TubeBenderScreenSpace=Object.freeze({
      sizeAt,worldUnitsPerPixel,register,unregister,rebuildConstraints,
      settings:()=>Object.freeze({...settings}),
      setSetting:(key,value)=>{if(!(key in DEFAULTS))throw new Error("Unknown marker size setting");const min=key==="dimension_text_px"?6:3,max=key==="dimension_text_px"?48:30;settings={...settings,[key]:clamp(value,min,max)};save();renderPanel();return settings[key];}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();