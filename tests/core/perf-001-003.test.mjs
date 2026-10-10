import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createFrameCoalescer,runIsolatedStartup} from "../../src/domain/performance/render-startup.mjs";

function mockFrames(){
  const frames=new Map();
  let id=0;
  return {
    frames,
    requestFrame(callback){frames.set(++id,callback);return id;},
    cancelFrame(id){frames.delete(id);},
    flush(){
      const jobs=[...frames.values()];
      frames.clear();
      for(const job of jobs)job();
    }
  };
}

test("PERF-001: rapid single-parameter updates coalesce to one 3D draw",()=>{
  const clock=mockFrames(),renders=[];
  const coalescer=createFrameCoalescer({
    requestFrame:cb=>clock.requestFrame(cb),
    cancelFrame:id=>clock.cancelFrame(id),
    render:fit=>renders.push(fit)
  });
  for(let i=0;i<50;i++)coalescer.schedule(i%2===0);
  assert.equal(clock.frames.size,1);
  assert.equal(coalescer.stats.requests,50);
  clock.flush();
  assert.deepEqual(renders,[false],"most recent update wins");
  assert.equal(coalescer.stats.draws,1);
  assert.equal(coalescer.stats.failures,0);
  assert.ok(coalescer.stats.lastWaitMs>=0);
  coalescer.schedule(true);
  clock.flush();
  assert.deepEqual(renders,[false,true],"new frame uses latest state");
});

test("PERF-001: cancel and dispose do not draw stale geometry",()=>{
  const clock=mockFrames(),renders=[];
  const c=createFrameCoalescer({
    requestFrame:fn=>clock.requestFrame(fn),
    cancelFrame:id=>clock.cancelFrame(id),
    render:fit=>renders.push(fit)
  });
  c.schedule();
  assert.equal(c.cancel(),true);
  clock.flush();
  assert.equal(renders.length,0);
  c.schedule(false);
  c.dispose();
  assert.equal(c.schedule(true),false);
  clock.flush();
  assert.equal(renders.length,0);
});

test("PERF-001: one renderer failure cannot poison the next redraw",()=>{
  const clock=mockFrames(),errors=[];let draws=0;
  const c=createFrameCoalescer({
    requestFrame:fn=>clock.requestFrame(fn),
    render(){if(draws++===0)throw new Error("WebGL context lost");},
    onError:e=>errors.push(e.message)
  });
  c.schedule();clock.flush();
  c.schedule();clock.flush();
  assert.deepEqual(errors,["WebGL context lost"]);
  assert.equal(c.stats.requests,2);
  assert.equal(c.stats.draws,1);
  assert.equal(c.stats.failures,1);
});

test("PERF-001: telemetry captures frame wait and rendering cost deterministically",()=>{
  const clock=mockFrames();let time=100;
  const c=createFrameCoalescer({
    requestFrame:fn=>clock.requestFrame(fn),
    now:()=>time,
    render(){time+=7;}
  });
  c.schedule();time+=13;clock.flush();
  assert.equal(c.stats.lastWaitMs,13);
  assert.equal(c.stats.lastRenderMs,7);
  c.schedule();time+=4;clock.flush();
  assert.equal(c.stats.lastWaitMs,4);
  assert.equal(c.stats.maxWaitMs,13);
  assert.equal(c.stats.maxRenderMs,7);
  const snapshot=c.stats;
  snapshot.draws=999;
  assert.equal(c.stats.draws,2,"diagnostic snapshot is read-only by value");
});

test("PERF-003: failure before bind() does not disable core command handlers",()=>{
  const actions=[],errors=[];
  const phases=runIsolatedStartup([
    ["optional-initializer",()=>{actions.push("optional");throw new Error("Plugin unavailable");}],
    ["bind",()=>{actions.push("bind");}],
    ["renderAll",()=>{actions.push("render");}]
  ],(phase,e)=>errors.push([phase,e.message]));
  assert.deepEqual(actions,["optional","bind","render"]);
  assert.deepEqual(phases.map(x=>x.status),["failed","ok","ok"]);
  assert.deepEqual(errors,[["optional-initializer","Plugin unavailable"]]);
});

test("PERF-003: reporting an optional failure may fail without stopping bind()",()=>{
  let bound=false;
  const phases=runIsolatedStartup([
    ["optional",()=>{throw Error("broken feature");}],
    ["bind",()=>{bound=true;}]
  ],()=>{throw Error("reporter failed");});
  assert.equal(bound,true);
  assert.equal(phases[0].status,"failed");
  assert.equal(phases[1].status,"ok");
});

test("PERF-001/003: standalone builder applies guarded render and bind hooks",()=>{
  const build=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  for(const required of [
    "perfOldViewerCall","tbViewerFrameCoalescer.schedule",
    "perfOldDoubleCollision","perfInitAnchor","tbRunIsolatedStartup",
    "window.TubeBenderStartupStatus","window.TubeBenderRenderPerformance"
  ])assert.ok(build.includes(required),"missing build integration "+required);
});
