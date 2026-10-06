(()=>{
  const NAMED_VIEWS_URL="__TB_NAMED_VIEWS_MODULE_URL__";
  let domain=null,installed=false,panel=null,toggle=null,providerUnregister=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const clone=v=>v==null?v:structuredClone(v);
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};
  function command(label,mutate){
    const fn=eng()?.modelCommand;let ok;
    try{ok=typeof fn==="function"?fn(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();}catch{}
    renderPanel();dispatch();return true;
  }
  function stateValue(){try{return eng()?.getState?.()??null;}catch{return null;}}
  function vec3(value,fallback={x:0,y:0,z:0}){
    const v=value??fallback;
    return {x:Number(v.x)||0,y:Number(v.y)||0,z:Number(v.z)||0};
  }
  function captureCamera(){
    if(typeof camera==="undefined"||!camera||typeof controls==="undefined"||!controls)throw new Error("Viewer camera is unavailable");
    const projection=camera.isOrthographicCamera?"orthographic":"perspective";
    const out={
      projection,
      position:vec3(camera.position),
      target:vec3(controls.target),
      up:vec3(camera.up,{x:0,y:0,z:1}),
      zoom:Number(camera.zoom)||1,
      near:Number(camera.near)||0.01,
      far:Number(camera.far)||5000
    };
    if(projection==="perspective")out.fov=Number(camera.fov)||55;
    else Object.assign(out,{
      left:Number(camera.left)||-1,right:Number(camera.right)||1,
      top:Number(camera.top)||1,bottom:Number(camera.bottom)||-1
    });
    return out;
  }
  function captureUcs(){
    try{
      const custom=window.TubeBenderUCS?.capture?.();
      if(custom)return custom;
    }catch{}
    const p=project(),s=stateValue();
    return {
      bbox_anchor:clone(p?.bboxAnchor??s?.bboxAnchor??{x:0,y:0,z:0}),
      coordinate_offset:clone(p?.coordinateOffset??s?.coordinateOffset??{x:0,y:0,z:0}),
      axis_signs:clone(s?.axisSigns??{x:1,y:1,z:1})
    };
  }
  function captureWorkPlane(){
    try{
      const custom=window.TubeBenderWorkPlane?.capture?.();
      if(custom)return custom;
    }catch{}
    const p=project();
    return clone(p?.work_plane_state??{
      id:"world-xy",name:"World XY",origin:{x:0,y:0,z:0},normal:{x:0,y:0,z:1},x_axis:{x:1,y:0,z:0}
    });
  }
  function captureEnvironment(){
    const p=project();
    return {
      view_mode:typeof currentViewMode!=="undefined"?String(currentViewMode):"user",
      projection_mode:typeof cameraProjectionMode!=="undefined"?String(cameraProjectionMode):(typeof camera!=="undefined"&&camera?.isOrthographicCamera?"orthographic":"perspective"),
      active_layer_id:p?.active_layer_id??null,
      layer_tree_filter_id:p?.layer_tree_filter_id??null,
      layers:(p?.layers??[]).map(layer=>({
        id:String(layer.id??""),visible:layer.visible!==false,frozen:layer.frozen===true,locked:layer.locked===true
      })).filter(layer=>layer.id)
    };
  }
  function captureSnapshot(name="Named View"){
    return {
      name,
      camera:captureCamera(),
      active_ucs:captureUcs(),
      work_plane:captureWorkPlane(),
      environment:captureEnvironment()
    };
  }
  function restoreCamera(snapshot){
    if(!snapshot)return false;
    const projection=String(snapshot.projection??"perspective");
    try{
      if(typeof switchCameraProjection==="function")switchCameraProjection(projection);
    }catch{}
    if(typeof camera==="undefined"||!camera||typeof controls==="undefined"||!controls)return false;
    camera.position.set(snapshot.position.x,snapshot.position.y,snapshot.position.z);
    camera.up.set(snapshot.up.x,snapshot.up.y,snapshot.up.z);
    controls.target.set(snapshot.target.x,snapshot.target.y,snapshot.target.z);
    camera.zoom=Number(snapshot.zoom)||1;
    camera.near=Math.max(0.0001,Number(snapshot.near)||0.01);
    camera.far=Math.max(camera.near+1,Number(snapshot.far)||5000);
    if(camera.isPerspectiveCamera&&Number.isFinite(Number(snapshot.fov)))camera.fov=Number(snapshot.fov);
    if(camera.isOrthographicCamera){
      for(const key of ["left","right","top","bottom"])if(Number.isFinite(Number(snapshot[key])))camera[key]=Number(snapshot[key]);
    }
    camera.lookAt(controls.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    controls.camera=camera;controls.update();
    try{camera.userData=camera.userData||{};camera.userData.tbViewUp=clone(snapshot.up);}catch{}
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
    return true;
  }
  function restoreUcs(snapshot){
    if(!snapshot)return;
    try{
      if(window.TubeBenderUCS?.restore){window.TubeBenderUCS.restore(clone(snapshot));return;}
    }catch{}
    const p=project(),s=stateValue();
    // Existing bbox-anchor setter re-expresses tube coordinates while preserving physical world geometry.
    try{
      if(typeof setBBoxAnchor==="function")setBBoxAnchor(clone(snapshot.bbox_anchor));
      else if(p)p.bboxAnchor=clone(snapshot.bbox_anchor);
    }catch{}
    if(s?.axisSigns)Object.assign(s.axisSigns,clone(snapshot.axis_signs));
    if(p&&!p.coordinateOffset)p.coordinateOffset=clone(snapshot.coordinate_offset);
  }
  function restoreWorkPlane(snapshot){
    if(!snapshot)return;
    try{
      if(window.TubeBenderWorkPlane?.restore){window.TubeBenderWorkPlane.restore(clone(snapshot));return;}
    }catch{}
    const p=project();if(p)p.work_plane_state=clone(snapshot);
  }
  function restoreEnvironment(snapshot){
    if(!snapshot)return;
    const p=project();if(!p)return;
    if(snapshot.active_layer_id!=null&&p.layers?.some(layer=>String(layer.id)===String(snapshot.active_layer_id)))p.active_layer_id=String(snapshot.active_layer_id);
    p.layer_tree_filter_id=snapshot.layer_tree_filter_id==null?null:String(snapshot.layer_tree_filter_id);
    const states=new Map((snapshot.layers??[]).map(layer=>[String(layer.id),layer]));
    for(const layer of p.layers??[]){
      const saved=states.get(String(layer.id));if(!saved)continue;
      layer.visible=saved.visible!==false;layer.frozen=saved.frozen===true;layer.locked=saved.locked===true;
    }
    try{if(typeof currentViewMode!=="undefined")currentViewMode=String(snapshot.view_mode??"user");}catch{}
    try{window.TubeBenderLayers?.applyAll?.();}catch{}
  }
  function createFromCurrent(name="Named View"){
    let created=null;
    const snapshot=captureSnapshot(name);
    const ok=command("Создать Named View",()=>{created=domain.createNamedView(project(),snapshot);return true;});
    return ok?created:false;
  }
  function updateFromCurrent(id){
    const current=domain.namedViewById(project(),id);if(!current)return false;
    const snapshot=captureSnapshot(current.name);
    return command("Обновить Named View",()=>{domain.updateNamedView(project(),id,snapshot);return true;});
  }
  function rename(id,name){return command("Переименовать Named View",()=>{domain.renameNamedView(project(),id,name);return true;});}
  function deleteView(id){return command("Удалить Named View",()=>domain.deleteNamedView(project(),id));}
  function restore(id){
    const view=domain.namedViewById(project(),id);if(!view)return false;
    restoreUcs(view.active_ucs);
    restoreWorkPlane(view.work_plane);
    restoreEnvironment(view.environment);
    restoreCamera(view.camera);
    try{eng()?.save?.();}catch{}
    toast("Вид восстановлен: "+view.name);
    dispatch(id);return true;
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbNamedViewsStyles";style.textContent=
      '#tbNamedViewsToggle{position:fixed;right:565px;top:54px;z-index:120372;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbNamedViewsPanel{position:fixed;right:14px;top:88px;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120365;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbNamedViewsPanel.open{display:flex}.tb-nv-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-nv-head .grow{flex:1}.tb-nv-body{overflow:auto;padding:8px}.tb-nv-grid{display:grid;grid-template-columns:120px 1fr;gap:7px;align-items:center}.tb-nv-grid input,.tb-nv-grid select{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-nv-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.tb-nv-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 7px;cursor:pointer}.tb-nv-note{color:#8396aa;margin-top:7px;line-height:1.35}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbNamedViewsToggle";toggle.type="button";toggle.textContent="Views";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbNamedViewsPanel";
    panel.innerHTML='<div class="tb-nv-head"><b>Named Views</b><span class="grow"></span><button data-nv-close>×</button></div><div class="tb-nv-body" data-nv-body></div>';document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderPanel();};panel.querySelector("[data-nv-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function renderPanel(selectedId=null){
    if(!domain)return;const p=project();if(!p)return;const root=ensurePanel(),body=root.querySelector("[data-nv-body]");
    const views=domain.ensureNamedViewState(p),id=selectedId??body.dataset.activeView??views[0]?.id??"",view=id?domain.namedViewById(p,id):null;
    body.dataset.activeView=view?.id??"";
    const options='<option value="">—</option>'+views.map(item=>'<option value="'+esc(item.id)+'" '+(String(item.id)===String(view?.id)?"selected":"")+'>'+esc(item.name)+'</option>').join("");
    body.innerHTML='<div class="tb-nv-grid"><label>Named View</label><select data-nv-select>'+options+'</select><label>Name</label><input data-nv-name value="'+esc(view?.name??"Named View")+'"><label>Projection</label><span>'+esc(view?.camera?.projection??"—")+'</span><label>Work plane</label><span>'+esc(view?.work_plane?.name??"—")+'</span></div>'+
      '<div class="tb-nv-actions"><button data-nv-create>Save current</button><button data-nv-restore '+(!view?"disabled":"")+'>Restore</button><button data-nv-update '+(!view?"disabled":"")+'>Update from current</button><button data-nv-rename '+(!view?"disabled":"")+'>Rename</button><button data-nv-delete '+(!view?"disabled":"")+'>Delete</button></div>'+
      '<div class="tb-nv-note">Named View сохраняет camera + zoom, active UCS, work plane и view environment (включая состояние Layers). Геометрия модели в вид не копируется.</div>';
    body.querySelector("[data-nv-select]").onchange=e=>renderPanel(e.target.value||null);
    body.querySelector("[data-nv-create]").onclick=()=>{const created=createFromCurrent(body.querySelector("[data-nv-name]").value);if(created)renderPanel(created.id);};
    if(!view)return;
    body.querySelector("[data-nv-restore]").onclick=()=>restore(view.id);
    body.querySelector("[data-nv-update]").onclick=()=>updateFromCurrent(view.id);
    body.querySelector("[data-nv-rename]").onclick=()=>rename(view.id,body.querySelector("[data-nv-name]").value);
    body.querySelector("[data-nv-delete]").onclick=()=>deleteView(view.id);
  }
  function provider({query=""}={}){
    const q=String(query??"").trim().toLowerCase();
    return domain.ensureNamedViewState(project()).map(view=>{
      const name=String(view.name),lower=name.toLowerCase();
      if(q&&!lower.includes(q)&&!("view "+lower).includes(q))return null;
      return {command:{id:"named-view:"+view.id,name_en:"View: "+name,name_ru:"Вид: "+name,run:()=>restore(view.id)},aliases:[name],score:lower===q?520:230};
    }).filter(Boolean);
  }
  function registerProvider(){providerUnregister?.();providerUnregister=window.TubeBenderCommandLine?.registerProvider?.(provider)??null;}
  function dispatch(activeId=null){try{window.dispatchEvent(new CustomEvent("tubebender-named-view-change",{detail:{active_view_id:activeId,views:clone(project()?.named_views??[])}}));}catch{}}
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(NAMED_VIEWS_URL);}catch(error){console.error("Named Views failed",error);return;}
    domain.ensureNamedViewState(project());ensurePanel();renderPanel();registerProvider();
    window.addEventListener("tubebender-command-line-ready",registerProvider);
    window.TubeBenderNamedViews=Object.freeze({
      createFromCurrent,updateFromCurrent,restore,rename,deleteView,
      views:()=>clone(domain.ensureNamedViewState(project())),byId:id=>clone(domain.namedViewById(project(),id)),
      captureSnapshot,openPanel:()=>{ensurePanel().classList.add("open");renderPanel();},renderPanel,domain
    });
    registerProvider();dispatch();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();