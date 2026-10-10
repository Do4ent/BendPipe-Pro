import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createSceneRecoveryCoalescer} from "../../src/domain/performance/render-startup.mjs";

function clock({ignoreCancellation=false}={}){
  const callbacks=new Map();
  let nextId=0;
  return {
    callbacks,
    requestFrame(fn){const id=++nextId;callbacks.set(id,fn);return id;},
    cancelFrame(id){if(!ignoreCancellation)callbacks.delete(id);},
    flush(){
      const scheduled=[...callbacks.values()];
      callbacks.clear();
      for(const callback of scheduled)callback();
    }
  };
}

test("PERF-001: burst of stale DWFx recovery events requests only one new frame",()=>{
  const frames=clock(),project={id:"current"},rendered=[];
  const recovery=createSceneRecoveryCoalescer({
    requestFrame:fn=>frames.requestFrame(fn),
    cancelFrame:id=>frames.cancelFrame(id),
    isCurrent:candidate=>candidate===project,
    render:value=>rendered.push(value)
  });
  for(let i=0;i<50;i++)assert.equal(recovery.schedule(project),true);
  assert.equal(recovery.pending,true);
  assert.equal(frames.callbacks.size,1);
  assert.equal(recovery.stats.requests,50);
  assert.equal(recovery.stats.frames,1);
  assert.equal(recovery.stats.coalesced,49);
  frames.flush();
  assert.deepEqual(rendered,[project]);
  assert.equal(recovery.stats.rendered,1);
  assert.equal(recovery.pending,false);
  recovery.schedule(project);
  frames.flush();
  assert.equal(recovery.stats.rendered,2,"later independent stale batch still recovers");
});

test("PERF-001: stale recovery targets the latest active project only",()=>{
  const frames=clock(),a={id:"old"},b={id:"new"},rendered=[];
  let active=b;
  const recovery=createSceneRecoveryCoalescer({
    requestFrame:fn=>frames.requestFrame(fn),
    isCurrent:candidate=>candidate===active,
    render:project=>rendered.push(project)
  });
  recovery.schedule(a);
  recovery.schedule(b);
  frames.flush();
  assert.deepEqual(rendered,[b],"latest active project wins");

  recovery.schedule(a);
  frames.flush();
  assert.deepEqual(rendered,[b],"inactive project cannot force re-render");
  assert.equal(recovery.stats.skipped,2,"both inactive requests are ignored");
  active=a;
  recovery.schedule(a);
  frames.flush();
  assert.deepEqual(rendered,[b,a]);
});

test("PERF-001: an obsolete notification cannot replace a queued recovery for the current project",()=>{
  const frames=clock(),oldProject={id:"stale"},currentProject={id:"active"};
  const rendered=[];
  const recovery=createSceneRecoveryCoalescer({
    requestFrame:fn=>frames.requestFrame(fn),
    isCurrent:project=>project===currentProject,
    render:project=>rendered.push(project)
  });
  assert.equal(recovery.schedule(currentProject),true);
  assert.equal(recovery.schedule(oldProject),false,
    "late notification from inactive project must be discarded");
  assert.equal(frames.callbacks.size,1);
  frames.flush();
  assert.deepEqual(rendered,[currentProject]);
  assert.equal(recovery.stats.skipped,1);
  assert.equal(recovery.stats.rendered,1);
});

test("PERF-001: normal render cancels queued recovery even if frame cancellation is ineffective",()=>{
  const frames=clock({ignoreCancellation:true}),project={},rendered=[];
  const recovery=createSceneRecoveryCoalescer({
    requestFrame:fn=>frames.requestFrame(fn),
    cancelFrame:id=>frames.cancelFrame(id),
    isCurrent:()=>true,
    render:value=>rendered.push(value)
  });
  recovery.schedule(project);
  assert.equal(recovery.cancel(),true);
  assert.equal(recovery.cancel(),false);
  frames.flush();
  assert.equal(rendered.length,0,"cancelled callback must fail epoch check");
  assert.equal(recovery.stats.cancelled,1);
  recovery.schedule(project);
  frames.flush();
  assert.deepEqual(rendered,[project]);
});

test("PERF-001: errors and dispose cannot leave duplicate recovery frames",()=>{
  const frames=clock(),project={},errors=[];
  let calls=0;
  const recovery=createSceneRecoveryCoalescer({
    requestFrame:fn=>frames.requestFrame(fn),
    cancelFrame:id=>frames.cancelFrame(id),
    isCurrent:()=>{if(calls++===0)throw Error("project lookup failed");return true;},
    render(){throw Error("render failed");},
    onError:e=>errors.push(e.message)
  });
  recovery.schedule(project);frames.flush();
  assert.equal(recovery.pending,false);
  recovery.schedule(project);frames.flush();
  assert.deepEqual(errors,["project lookup failed","render failed"]);
  assert.equal(recovery.stats.failures,2);
  recovery.schedule(project);
  recovery.dispose();
  assert.equal(recovery.schedule(project),false);
  frames.flush();
  assert.equal(recovery.stats.cancelled,1);
  assert.equal(recovery.stats.rendered,0);
});

test("PERF-001: failed animation-frame registration does not wedge recovery scheduler",()=>{
  const frames=clock(),project={},errors=[];
  let throwOnce=true;
  const recovery=createSceneRecoveryCoalescer({
    requestFrame(fn){
      if(throwOnce){throwOnce=false;throw Error("rAF unavailable");}
      return frames.requestFrame(fn);
    },
    isCurrent:()=>true,
    render(){},
    onError:e=>errors.push(e.message)
  });
  assert.equal(recovery.schedule(project),false);
  assert.equal(recovery.pending,false);
  assert.equal(recovery.stats.failures,1);
  assert.equal(recovery.schedule(project),true);
  frames.flush();
  assert.equal(recovery.stats.rendered,1);
  assert.deepEqual(errors,["rAF unavailable"]);
});

test("PERF-001: standalone builder cancels redundant DWFx retries on normal render",()=>{
  const builder=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.match(builder,/createSceneRecoveryCoalescer\.toString\(\)/);
  assert.match(builder,/tbDwfSceneRecovery\.cancel\(\)/);
  assert.match(builder,/onStale:\(\)=>tbDwfSceneRecovery\.schedule\(referenceProject\)/);
  assert.match(builder,/isCurrent: project=>activeProject\(\)===project/);
  assert.doesNotMatch(builder,/onStale:\(\)=>requestAnimationFrame/);
  assert.match(builder,/window\.TubeBenderDwfRecovery/);
});
