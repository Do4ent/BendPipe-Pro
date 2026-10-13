(()=>{
  const TOLERANCE_URL="__TB_TOLERANCE_PROFILE_MODULE_URL__";
  let installed=false,domain=null,panel=null,toggle=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const toast=(m)=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function ensure(){
    const p=project();if(!p||!domain)return null;
    return domain.ensureProjectGeometryToleranceProfile(p);
  }
  function profile(){
    const current=ensure();
    return current?Object.freeze(clone(current)):null;
  }
  function snapSettings(base={}){
    const current=profile()??domain.DEFAULT_GEOMETRY_TOLERANCE_PROFILE;
    return domain.snapSettingsFromToleranceProfile(current,base);
  }
  function recognitionSettings(base={}){
    const current=profile()??domain.DEFAULT_GEOMETRY_TOLERANCE_PROFILE;
    return domain.recognitionSettingsFromToleranceProfile(current,base);
  }
  function dispatch(){
    try{window.dispatchEvent(new CustomEvent("tubebender-tolerance-change",{detail:{profile:profile()}}));}catch{}
  }
  function commit(next){
    const p=project();if(!p)return false;
    let normalized;
    try{normalized=domain.normalizeGeometryToleranceProfile(next);}
    catch(error){toast(error?.message??error);return false;}
    const mutate=()=>{p.geometry_tolerance_profile={...normalized};return true;};
    const command=eng()?.modelCommand;
    const ok=typeof command==="function"?command("Geometry tolerance profile",mutate):mutate();
    if(ok===false)return false;
    try{eng()?.save?.();}catch{}
    render();dispatch();return true;
  }
  function reset(){
    return commit(domain.DEFAULT_GEOMETRY_TOLERANCE_PROFILE);
  }
  function ensureUi(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbToleranceProfileStyles";
    style.textContent=
      '#tbToleranceToggle{position:fixed;right:238px;top:54px;z-index:120366;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}'+
      '#tbTolerancePanel{position:fixed;right:14px;top:88px;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120359;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbTolerancePanel.open{display:flex}.tb-tol-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-tol-head .grow{flex:1}.tb-tol-body{overflow:auto;padding:9px}.tb-tol-grid{display:grid;grid-template-columns:minmax(170px,1fr) 110px 38px;gap:7px;align-items:center}.tb-tol-grid input{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-tol-unit{color:#91a5ba}.tb-tol-note{margin-top:9px;color:#91a5ba;line-height:1.4}.tb-tol-actions{display:flex;gap:6px;margin-top:9px}.tb-tol-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 8px;cursor:pointer}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbToleranceToggle";toggle.type="button";toggle.textContent="Tolerances";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbTolerancePanel";
    panel.innerHTML='<div class="tb-tol-head"><b>Geometry Tolerances</b><span class="grow"></span><button data-tol-close>×</button></div><div class="tb-tol-body" data-tol-body></div>';
    document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");render();};
    panel.querySelector("[data-tol-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function field(label,key,unit,value){
    return '<label>'+esc(label)+'</label><input type="number" min="'+(key==="cursor_capture_radius_px"?'1':'0')+'" step="'+(unit==="deg"?'0.01':unit==="px"?'1':'0.001')+'" data-tol="'+esc(key)+'" value="'+esc(value)+'"><span class="tb-tol-unit">'+esc(unit)+'</span>';
  }
  function render(){
    if(!domain)return;
    const p=project();if(!p)return;
    const current=ensure(),root=ensureUi(),body=root.querySelector("[data-tol-body]");
    body.innerHTML='<div class="tb-tol-grid">'+
      field("Point","point_tolerance_mm","mm",current.point_tolerance_mm)+
      field("Linear","linear_tolerance_mm","mm",current.linear_tolerance_mm)+
      field("Angular","angular_tolerance_deg","deg",current.angular_tolerance_deg)+
      field("Coplanar","coplanar_tolerance_mm","mm",current.coplanar_tolerance_mm)+
      field("Circle / Arc fitting","circle_arc_fit_tolerance_mm","mm",current.circle_arc_fit_tolerance_mm)+
      field("Tangent","tangent_tolerance_deg","deg",current.tangent_tolerance_deg)+
      field("Cursor capture radius","cursor_capture_radius_px","px",current.cursor_capture_radius_px)+
      '</div><div class="tb-tol-note">Математические допуски задаются в mm/deg. Cursor capture radius — только экранный радиус в px и не участвует в распознавании геометрии.</div>'+
      '<div class="tb-tol-actions"><button data-tol-apply>Применить</button><button data-tol-reset>Defaults</button></div>';
    body.querySelector("[data-tol-apply]").onclick=()=>{
      const next={};
      body.querySelectorAll("[data-tol]").forEach(input=>next[input.dataset.tol]=Number(input.value));
      commit(next);
    };
    body.querySelector("[data-tol-reset]").onclick=()=>reset();
  }
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(TOLERANCE_URL);}catch(error){console.error("Tolerance profile runtime failed",error);return;}
    ensureUi();ensure();render();dispatch();
    window.TubeBenderToleranceProfile=Object.freeze({
      ensure,profile,snapSettings,recognitionSettings,commit,reset,render,
      createFitEvidence:(input)=>domain.createGeometryFitEvidence(input),
      exactEvidence:(evidence)=>domain.exactGeometryEvidence(evidence),
      domain
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();