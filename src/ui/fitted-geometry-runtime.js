(()=>{
  const POLICY_URL="__TB_FITTED_GEOMETRY_POLICY_MODULE_URL__";
  let installed=false,policy=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const clone=(v)=>v==null?v:structuredClone(v);
  function assessment(usage,input){
    if(!policy)return {allowed:true,requires_confirmation:false,has_fitted_geometry:false,fitted_evidence:[]};
    return policy.assessFittedGeometryUsage(input,usage);
  }
  function evidenceSummary(items=[]){
    let maxMm=0,maxDeg=0,minConfidence=1;
    for(const item of items){
      const err=item?.fitting_error;
      if(typeof err==="number")maxMm=Math.max(maxMm,Number(err)||0);
      else if(err&&typeof err==="object"){
        maxMm=Math.max(maxMm,Number(err.mm??err.radial_mm??err.coplanar_mm??0)||0);
        maxDeg=Math.max(maxDeg,Number(err.deg??0)||0);
      }
      if(Number.isFinite(Number(item?.confidence)))minConfidence=Math.min(minConfidence,Number(item.confidence));
    }
    return {count:items.length,max_mm:maxMm,max_deg:maxDeg,min_confidence:minConfidence};
  }
  function messageFor(usage,result){
    const s=evidenceSummary(result?.fitted_evidence??[]);
    const parts=[
      "Операция использует Fitted-геометрию.",
      "Назначение: "+String(usage)+".",
      "Опор Fitted: "+s.count+"."
    ];
    if(s.max_mm>0)parts.push("Max fitting error: "+s.max_mm.toFixed(4)+" mm.");
    if(s.max_deg>0)parts.push("Max angular error: "+s.max_deg.toFixed(4)+"°.");
    if(s.min_confidence<1)parts.push("Min confidence: "+Math.round(s.min_confidence*100)+"%.");
    parts.push("Продолжить и использовать аппроксимированную геометрию как управляющую?");
    return parts.join("\n");
  }
  function confirmUsage(usage,input,{preview_confirmed=false,confirm_fn=null}={}){
    const result=assessment(usage,input);
    if(!result.requires_confirmation)return true;
    if(preview_confirmed===true)return true;
    const fn=typeof confirm_fn==="function"?confirm_fn:globalThis.confirm;
    if(typeof fn!=="function")return false;
    return fn(messageFor(usage,result))===true;
  }
  function warningHtml(usage,input){
    const result=assessment(usage,input);
    if(!result.requires_confirmation)return "";
    const s=evidenceSummary(result.fitted_evidence);
    return '<div class="tb-fitted-warning"><b>⚠ Fitted geometry</b> · '+String(s.count)+' reference(s)'+
      (s.max_mm>0?' · max '+s.max_mm.toFixed(4)+' mm':'')+
      (s.min_confidence<1?' · confidence ≥ '+Math.round(s.min_confidence*100)+'%':'')+
      '. Применение создаст управляющую зависимость по аппроксимированной геометрии.</div>';
  }
  async function install(){
    if(installed)return;installed=true;
    try{policy=await import(POLICY_URL);}catch(error){console.error("Fitted geometry policy runtime failed",error);return;}
    const style=document.createElement("style");style.id="tbFittedGeometryStyles";
    style.textContent='.tb-fitted-warning{margin:7px 0;padding:7px 8px;border:1px solid #9a7130;border-radius:5px;background:#2d2414;color:#ffd994;line-height:1.35}.tb-fitted-warning b{color:#ffe6aa}';
    document.head.appendChild(style);
    window.TubeBenderFittedGeometry=Object.freeze({
      assessment,confirmUsage,warningHtml,evidenceSummary,
      collectEvidence:(input)=>policy.collectGeometryEvidence(input),
      fittedEvidence:(input)=>policy.fittedGeometryEvidence(input),
      hasFitted:(input)=>policy.hasFittedGeometry(input),
      policy
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();