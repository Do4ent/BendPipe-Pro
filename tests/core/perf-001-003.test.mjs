import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {createFrameCoalescer,runIsolatedStartup,createCooperativeSceneQueue} from "../../src/domain/performance/render-startup.mjs";

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

test("PERF-003: generated optional pickers execute independently without cross-script helpers",()=>{
  const builder=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  const start=builder.indexOf("output=output.replace(perfPickerAnchor,");
  const end=builder.indexOf("const perfBindStart=",start);
  assert.ok(start>=0&&end>start,"expected optional-picker builder patch");
  const context={output:"__PICKERS__",perfPickerAnchor:"__PICKERS__"};
  vm.runInNewContext(builder.slice(start,end),context,{timeout:1000});
  assert.doesNotMatch(context.output,/\\n/,"generated JavaScript must contain actual line breaks");
  assert.doesNotMatch(context.output,/tbRunIsolatedStartup/,"optional picker code must be self-contained");
  const called=[],warnings=[];
  vm.runInNewContext("function bind(){\n"+context.output+"\n}\nbind();",{
    buildViewPicker(){called.push("view");},
    buildBendPicker(){called.push("bend");throw new Error("optional picker failed");},
    setupMiniAxisClickHandlers(){called.push("axis");},
    console:{warn(name){warnings.push(name);}}
  },{timeout:1000});
  assert.deepEqual(called,["view","bend","axis"]);
  assert.deepEqual(warnings,["Optional picker initialization: buildBendPicker"]);
});

test("PERF-003: empty scene queue completes without phantom task or batch",()=>{
  let scheduled=0;
  const completions=[];
  const queue=createCooperativeSceneQueue({
    postTask(){scheduled++;return scheduled;},
    processItem(){assert.fail("empty queue must not process geometry");},
    onComplete:stats=>completions.push(stats)
  });
  queue.start([]);
  assert.equal(scheduled,0);
  assert.equal(queue.pending,false);
  assert.equal(completions.length,1);
  assert.deepEqual(completions[0],{completed:0,total:0,batches:0,failures:0});
  assert.deepEqual(queue.progress,{completed:0,total:0,batches:0,failures:0});
});

test("PERF-003: stale callback cannot erase replacement scene task handle",()=>{
  const jobs=new Map(),cancelled=[];
  let nextId=0;
  const seen=[];
  const queue=createCooperativeSceneQueue({
    postTask(callback){const id=++nextId;jobs.set(id,callback);return id;},
    cancelTask(id){cancelled.push(id);}, // deliberately simulates a late callback
    processItem:item=>seen.push(item),
    batchSize:1
  });
  queue.start(["old"]);
  const old=jobs.get(1);
  queue.start(["new"]);
  assert.deepEqual(cancelled,[1]);
  old(); // callback from cancelled generation arrives late
  queue.cancel();
  assert.deepEqual(cancelled,[1,2],"replacement handle must remain cancellable");
  jobs.get(2)();
  assert.deepEqual(seen,[],"cancelled new generation must never run");
});

test("PERF-003: synchronous restart inside processItem cannot alter replacement progress",()=>{
  const jobs=[];
  const seen=[];
  let queue;
  queue=createCooperativeSceneQueue({
    postTask:callback=>{jobs.push(callback);return jobs.length;},
    processItem:item=>{
      seen.push(item);
      if(item==="old-first")queue.start(["replacement"]);
    },
    batchSize:2
  });
  queue.start(["old-first","old-second"]);
  jobs.shift()();
  assert.deepEqual(seen,["old-first"]);
  assert.deepEqual(queue.progress,{completed:0,total:1,batches:0,failures:0});
  assert.equal(queue.pending,true);
  jobs.shift()();
  assert.deepEqual(seen,["old-first","replacement"]);
  assert.deepEqual(queue.progress,{completed:1,total:1,batches:1,failures:0});
  assert.equal(queue.pending,false);
});

test("PERF-003: synchronous single-item scheduler leaves no stale pending handle",()=>{
  const seen=[],cancelled=[];
  const queue=createCooperativeSceneQueue({
    postTask:callback=>{callback();return 42;},
    cancelTask:id=>cancelled.push(id),
    processItem:item=>seen.push(item),
    batchSize:1
  });
  queue.start(["item"]);
  assert.deepEqual(seen,["item"]);
  assert.equal(queue.pending,false);
  queue.cancel();
  assert.deepEqual(cancelled,[],"finished synchronous task must not be cancelled later");
});

test("PERF-003: synchronous restart does not overwrite replacement task handle",()=>{
  const jobs=new Map(),cancelled=[];
  let queue,sequence=0;
  queue=createCooperativeSceneQueue({
    postTask:callback=>{
      const id=++sequence;
      if(id===1){
        queue.start(["replacement"]);
        return id;
      }
      jobs.set(id,callback);
      return id;
    },
    cancelTask:id=>cancelled.push(id),
    processItem(){},
    batchSize:1
  });
  queue.start(["original"]);
  queue.cancel();
  assert.deepEqual(cancelled,[2]);
});

test("PERF-003: cancellation hook restarting scene preserves replacement task handle",()=>{
  const jobs=new Map(),cancelled=[];
  let sequence=0,queue;
  queue=createCooperativeSceneQueue({
    postTask(callback){const id=++sequence;jobs.set(id,callback);return id;},
    cancelTask(id){
      cancelled.push(id);
      if(id===1)queue.start(["replacement"]);
    },
    processItem(){},
    batchSize:1
  });
  queue.start(["old"]);
  queue.cancel();
  assert.equal(queue.pending,true,"replacement generation remains active");
  assert.deepEqual(queue.progress,{completed:0,total:1,batches:0,failures:0});
  queue.cancel();
  assert.deepEqual(cancelled,[1,2],"replacement task is not lost by outer cancellation");
  jobs.get(2)();
  assert.equal(queue.pending,false);
});

test("PERF-003: postTask failure reports once and leaves queue inactive",()=>{
  const errors=[],seen=[];
  const queue=createCooperativeSceneQueue({
    postTask(){throw new Error("scheduler unavailable");},
    processItem:item=>seen.push(item),
    onError:(error,index)=>errors.push([error.message,index])
  });
  queue.start(["unprocessed"]);
  assert.deepEqual(seen,[]);
  assert.deepEqual(errors,[["scheduler unavailable",0]]);
  assert.deepEqual(queue.progress,{completed:0,total:1,batches:0,failures:1});
  assert.equal(queue.pending,false);
});

test("PERF-003: onError may restart scene after a scheduling failure",()=>{
  const jobs=new Map(),seen=[],errors=[];
  let nextId=0,queue;
  queue=createCooperativeSceneQueue({
    postTask:callback=>{
      if(nextId++===0)throw new Error("first dispatch failed");
      jobs.set(nextId,callback);
      return nextId;
    },
    processItem:item=>seen.push(item),
    onError:(error,index)=>{
      errors.push([error.message,index]);
      queue.start(["replacement"]);
    }
  });
  queue.start(["original"]);
  assert.deepEqual(errors,[["first dispatch failed",0]]);
  assert.deepEqual(queue.progress,{completed:0,total:1,batches:0,failures:0});
  assert.equal(queue.pending,true);
  jobs.get(2)();
  assert.deepEqual(seen,["replacement"]);
  assert.deepEqual(queue.progress,{completed:1,total:1,batches:1,failures:0});
});

test("PERF-003: onError may cancel a failed item without scheduling later batches",()=>{
  const jobs=[];
  const seen=[];
  let queue;
  queue=createCooperativeSceneQueue({
    postTask:callback=>{jobs.push(callback);return jobs.length;},
    processItem:item=>{seen.push(item);throw new Error("bad CAD item");},
    onError:()=>queue.cancel(),
    batchSize:1
  });
  queue.start(["bad","must-not-run"]);
  jobs.shift()();
  assert.deepEqual(seen,["bad"]);
  assert.equal(queue.pending,false);
  assert.equal(jobs.length,0);
});

test("PERF-003: rescheduling failure retains completed batch and reports next index",()=>{
  const jobs=[],seen=[],errors=[],completions=[];
  let dispatches=0;
  const queue=createCooperativeSceneQueue({
    postTask(callback){
      if(++dispatches===2)throw new Error("second batch unavailable");
      jobs.push(callback);
      return dispatches;
    },
    processItem:item=>seen.push(item),
    onError:(error,index)=>errors.push([error.message,index]),
    onComplete:stats=>completions.push(stats),
    batchSize:1
  });
  queue.start(["first","second"]);
  jobs.shift()();
  assert.deepEqual(seen,["first"]);
  assert.deepEqual(errors,[["second batch unavailable",1]]);
  assert.deepEqual(queue.progress,{completed:1,total:2,batches:1,failures:1});
  assert.equal(queue.pending,false);
  assert.deepEqual(completions,[]);
});

test("PERF-001: late callback from cancelled frame cannot draw replacement state",()=>{
  const jobs=new Map(),rendered=[],cancelled=[];
  let nextId=0;
  const coalescer=createFrameCoalescer({
    requestFrame:callback=>{const id=++nextId;jobs.set(id,callback);return id;},
    cancelFrame:id=>cancelled.push(id),
    render:fit=>rendered.push(fit)
  });
  coalescer.schedule(true);
  coalescer.cancel();
  coalescer.schedule(false);
  jobs.get(1)(); // simulate a callback arriving after cancellation
  assert.deepEqual(rendered,[]);
  assert.equal(coalescer.pending,true);
  coalescer.cancel();
  assert.deepEqual(cancelled,[1,2],"replacement frame must retain its cancellation handle");
  jobs.get(2)();
  assert.deepEqual(rendered,[]);
});

test("PERF-001: synchronous animation frame completion retains no stale frame handle",()=>{
  const rendered=[],cancelled=[];
  const coalescer=createFrameCoalescer({
    requestFrame:callback=>{callback();return 77;},
    cancelFrame:id=>cancelled.push(id),
    render:fit=>rendered.push(fit)
  });
  assert.equal(coalescer.schedule(false),true);
  assert.deepEqual(rendered,[false]);
  assert.equal(coalescer.pending,false);
  assert.equal(coalescer.cancel(),false);
  assert.deepEqual(cancelled,[]);
});

test("PERF-001: render may schedule a new frame without losing its handle",()=>{
  const callbacks=new Map(),cancelled=[],rendered=[];
  let id=0,coalescer;
  coalescer=createFrameCoalescer({
    requestFrame:callback=>{const handle=++id;callbacks.set(handle,callback);return handle;},
    cancelFrame:handle=>cancelled.push(handle),
    render:fit=>{
      rendered.push(fit);
      if(rendered.length===1)coalescer.schedule(false);
    }
  });
  coalescer.schedule(true);
  callbacks.get(1)();
  assert.deepEqual(rendered,[true]);
  assert.equal(coalescer.pending,true);
  assert.equal(coalescer.cancel(),true);
  assert.deepEqual(cancelled,[2]);
  callbacks.get(2)();
  assert.deepEqual(rendered,[true]);
});

test("PERF-001: requestFrame failure permits recovery on next redraw",()=>{
  const callbacks=[],errors=[],rendered=[];
  let attempts=0;
  const coalescer=createFrameCoalescer({
    requestFrame:callback=>{
      if(++attempts===1)throw new Error("animation frame unavailable");
      callbacks.push(callback);
      return attempts;
    },
    render:fit=>rendered.push(fit),
    onError:error=>errors.push(error.message)
  });
  assert.equal(coalescer.schedule(true),false);
  assert.equal(coalescer.pending,false);
  assert.deepEqual(errors,["animation frame unavailable"]);
  assert.equal(coalescer.schedule(false),true);
  callbacks.shift()();
  assert.deepEqual(rendered,[false]);
  assert.equal(coalescer.stats.requests,2);
  assert.equal(coalescer.stats.draws,1);
  assert.equal(coalescer.stats.failures,1);
});

test("PERF-001: onError can reschedule after requestFrame failure",()=>{
  const callbacks=[],renders=[],errors=[];
  let attempts=0,coalescer;
  coalescer=createFrameCoalescer({
    requestFrame:callback=>{
      if(++attempts===1)throw new Error("frame scheduler failed");
      callbacks.push(callback);
      return attempts;
    },
    render:fit=>renders.push(fit),
    onError:error=>{
      errors.push(error.message);
      coalescer.schedule(false);
    }
  });
  assert.equal(coalescer.schedule(true),false,"original dispatch failed");
  assert.equal(coalescer.pending,true,"recovery callback scheduled a replacement");
  assert.deepEqual(errors,["frame scheduler failed"]);
  callbacks.shift()();
  assert.deepEqual(renders,[false]);
  assert.equal(coalescer.pending,false);
  assert.equal(coalescer.stats.failures,1);
  assert.equal(coalescer.stats.draws,1);
});
