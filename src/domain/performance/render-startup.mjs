/**
 * PERF-001: render the latest CAD state at most once per animation frame.
 * The geometry is not altered; only redundant 3D redraw requests are folded.
 */
export function createFrameCoalescer({requestFrame,cancelFrame=()=>{},render,onError=()=>{},now=()=>performance.now()}){
  if(typeof requestFrame!=="function"||typeof render!=="function"){
    throw new TypeError("requestFrame and render are required");
  }
  let pending=false,frameId=null,latestFit=true,disposed=false,requestedAt=0;
  // Durations are observational only: they never influence CAD geometry or scheduling.
  const stats={requests:0,draws:0,failures:0,lastWaitMs:null,maxWaitMs:null,lastRenderMs:null,maxRenderMs:null};
  const stamp=()=>{try{const value=now();return Number.isFinite(value)?value:null;}catch{return null;}};
  function draw(){
    frameId=null;
    if(disposed||!pending)return;
    pending=false;
    const fit=latestFit;
    const start=stamp();
    if(start!==null&&requestedAt!==null){
      stats.lastWaitMs=Math.max(0,start-requestedAt);
      stats.maxWaitMs=Math.max(stats.maxWaitMs??0,stats.lastWaitMs);
    }
    try{render(fit);stats.draws++;}
    catch(error){stats.failures++;try{onError(error);}catch{}}
    finally{
      const end=stamp();
      if(start!==null&&end!==null){
        stats.lastRenderMs=Math.max(0,end-start);
        stats.maxRenderMs=Math.max(stats.maxRenderMs??0,stats.lastRenderMs);
      }
    }
  }
  return Object.freeze({
    schedule(fit=true){
      if(disposed)return false;
      latestFit=fit!==false;
      stats.requests++;
      if(pending)return true;
      pending=true;
      requestedAt=stamp();
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
 * PERF-001: one stale DWFx recovery per animation frame, targeting only the
 * latest still-active project. A regular scene render can cancel an obsolete
 * retry. Epoch checks also guard against ineffective cancelFrame adapters.
 */
export function createSceneRecoveryCoalescer({
  requestFrame,cancelFrame=()=>{},isCurrent,render,onError=()=>{}
}){
  if(typeof requestFrame!=="function"||typeof isCurrent!=="function"||
     typeof render!=="function"){
    throw new TypeError("requestFrame, isCurrent and render are required");
  }
  let frameId=null,latestProject=null,epoch=0,disposed=false;
  const stats={requests:0,frames:0,coalesced:0,cancelled:0,skipped:0,rendered:0,failures:0};
  const report=(error)=>{
    stats.failures++;
    try{onError(error);}catch{}
  };
  function run(token){
    if(disposed||token!==epoch||frameId===null)return;
    frameId=null;
    const project=latestProject;
    latestProject=null;
    let current=false;
    try{current=isCurrent(project);}
    catch(error){report(error);return;}
    if(!current){stats.skipped++;return;}
    try{render(project);stats.rendered++;}
    catch(error){report(error);}
  }
  function cancel(){
    if(frameId===null)return false;
    epoch++;
    const id=frameId;
    frameId=null;latestProject=null;
    stats.cancelled++;
    try{cancelFrame(id);}catch(error){report(error);}
    return true;
  }
  return Object.freeze({
    schedule(project){
      if(disposed||project==null)return false;
      stats.requests++;
      latestProject=project;
      if(frameId!==null){stats.coalesced++;return true;}
      const token=++epoch;
      try{frameId=requestFrame(()=>run(token));stats.frames++;}
      catch(error){frameId=null;latestProject=null;report(error);return false;}
      return true;
    },
    cancel,
    dispose(){cancel();disposed=true;},
    get pending(){return frameId!==null;},
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

/**
 * Yield initial heavy project rendering until the browser has had an
 * opportunity to paint the bound controls. Both stages are asynchronous:
 * a timer hop after the second frame avoids running heavy work inside rAF.
 * The returned function cancels pending startup work on teardown.
 */
export function scheduleInitialSceneAfterPaint({
  requestFrame,
  cancelFrame=()=>{},
  postTask,
  cancelTask=()=>{},
  draw
}){
  if(typeof requestFrame!=="function"||typeof postTask!=="function"||
     typeof draw!=="function")throw new TypeError("render scheduling callbacks required");
  let cancelled=false,frame=null,task=null;
  const invoke=()=>{task=null;if(!cancelled)draw();};
  frame=requestFrame(()=>{
    frame=null;
    if(cancelled)return;
    frame=requestFrame(()=>{
      frame=null;
      if(cancelled)return;
      task=postTask(invoke);
    });
  });
  return ()=>{
    cancelled=true;
    if(frame!==null)try{cancelFrame(frame);}catch{}
    if(task!==null)try{cancelTask(task);}catch{}
  };
}

/**
 * Cooperative, cancellation-safe scene preparation. Each item is processed
 * exactly once, in stable input order. This is for independent preparation
 * stages only; geometry generation must supply its own deterministic adapter.
 */
export function createCooperativeSceneQueue({
  postTask,
  cancelTask=()=>{},
  processItem,
  onComplete=()=>{},
  onError=()=>{},
  batchSize=32
}){
  if(typeof postTask!=="function"||typeof processItem!=="function")
    throw new TypeError("postTask and processItem are required");
  if(!Number.isSafeInteger(batchSize)||batchSize<1)
    throw new RangeError("batchSize must be a positive safe integer");
  let generation=0,pending=null,active=false;
  const state={completed:0,total:0,batches:0,failures:0};
  const cancel=()=>{
    generation++;
    active=false;
    if(pending!==null){try{cancelTask(pending);}catch{}pending=null;}
  };
  function start(items){
    if(!Array.isArray(items))throw new TypeError("items must be an array");
    cancel();
    const token=generation,source=items.slice();
    let index=0;
    state.completed=0;state.total=source.length;state.batches=0;state.failures=0;
    active=true;
    function step(){
      pending=null;
      if(token!==generation||!active)return;
      const end=Math.min(index+batchSize,source.length);
      while(index<end){
        if(token!==generation||!active)return;
        try{processItem(source[index],index);}catch(error){
          state.failures++;
          try{onError(error,index);}catch{}
        }
        index++;state.completed=index;
      }
      state.batches++;
      if(index>=source.length){
        active=false;
        try{onComplete({...state});}catch{}
      }else{
        try{pending=postTask(step);}catch(error){
          active=false;state.failures++;
          try{onError(error,index);}catch{}
        }
      }
    }
    try{pending=postTask(step);}catch(error){
      active=false;state.failures++;
      try{onError(error,0);}catch{}
    }
    return token;
  }
  return Object.freeze({
    start,cancel,
    get pending(){return active;},
    get progress(){return {...state};}
  });
}
