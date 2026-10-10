/**
 * PERF-001: render the latest CAD state at most once per animation frame.
 * The geometry is not altered; only redundant 3D redraw requests are folded.
 */
export function createFrameCoalescer({requestFrame,cancelFrame=()=>{},render,onError=()=>{}}){
  if(typeof requestFrame!=="function"||typeof render!=="function"){
    throw new TypeError("requestFrame and render are required");
  }
  let pending=false,frameId=null,latestFit=true,disposed=false;
  const stats={requests:0,draws:0,failures:0};
  function draw(){
    frameId=null;
    if(disposed||!pending)return;
    pending=false;
    const fit=latestFit;
    try{render(fit);stats.draws++;}
    catch(error){stats.failures++;try{onError(error);}catch{}}
  }
  return Object.freeze({
    schedule(fit=true){
      if(disposed)return false;
      latestFit=fit!==false;
      stats.requests++;
      if(pending)return true;
      pending=true;
      try{frameId=requestFrame(draw);}
      catch(error){pending=false;stats.failures++;try{onError(error);}catch{}return false;}
      return true;
    },
    cancel(){
      if(!pending)return false;
      pending=false;
      try{cancelFrame(frameId);}catch{}
      frameId=null;
      return true;
    },
    dispose(){this.cancel();disposed=true;},
    get pending(){return pending;},
    get stats(){return {...stats};}
  });
}

/**
 * PERF-003: one failing optional initialization step cannot prevent bind() or
 * the remaining startup phases from being attempted.
 */
export function runIsolatedStartup(stages,reportError=()=>{}){
  if(!Array.isArray(stages))throw new TypeError("stages must be an array");
  const result=[];
  for(const entry of stages){
    const name=String(entry?.[0]??"unknown");
    const action=entry?.[1];
    try{
      if(typeof action!=="function")throw new TypeError(name+" must be a function");
      action();
      result.push({name,status:"ok"});
    }catch(error){
      result.push({name,status:"failed",error:String(error?.message??error)});
      try{reportError(name,error);}catch{}
    }
  }
  return result;
}
