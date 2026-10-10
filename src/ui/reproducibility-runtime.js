(()=>{
  const MODULE_URL="__TB_REPRODUCIBILITY_MODULE_URL__";
  let domain=null,installed=false;
  const api=()=>window.TubeBenderEngineering??null;
  const project=()=>{try{return api()?.activeProject?.()??null;}catch{return null;}};
  function store(p=project()){
    if(!p)return null;
    if(!p.reproducibility||typeof p.reproducibility!=="object")p.reproducibility={cpu:null,gpu:null,report:null};
    return p.reproducibility;
  }
  function refresh(p=project()){
    const s=store(p);if(!s||!domain)return {status:"NotChecked",ok:false,differences:[]};
    s.report=domain.compareCpuGpuEvidence(s.cpu,s.gpu);
    return s.report;
  }
  function record(backend,payload,{engine_version=null,device=null}={},p=project()){
    const s=store(p);if(!s)throw new Error("No active project");
    const ev=domain.createReproducibilityEvidence({backend,payload,engine_version,device});
    s[ev.backend]=ev;
    return refresh(p);
  }
  function clear(p=project()){
    const s=store(p);if(!s)return false;
    s.cpu=null;s.gpu=null;s.report=null;
    return true;
  }
  function report(p=project()){return refresh(p);}
  function releaseGate(p=project()){return domain.reproducibilityReleaseGate(refresh(p));}
  async function install(){
    if(installed)return;installed=true;
    domain=await import(MODULE_URL);
    window.TubeBenderReproducibility=Object.freeze({record,clear,report,releaseGate,tolerances:domain.REPRODUCIBILITY_TOLERANCES});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});
  else install().catch(console.error);
})();