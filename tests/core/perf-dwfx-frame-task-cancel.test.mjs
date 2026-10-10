import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createCancellableFrameTaskScheduler} from "../../src/domain/performance/render-startup.mjs";

function clock({ignoreCancel=false}={}){
  let lastFrame=0,lastTimer=0;
  const frames=new Map(),timers=new Map();
  return {
    frames,timers,
    requestFrame(fn){const id=++lastFrame;frames.set(id,fn);return id;},
    cancelFrame(id){if(!ignoreCancel)frames.delete(id);},
    postTask(fn){const id=++lastTimer;timers.set(id,fn);return id;},
    cancelTask(id){if(!ignoreCancel)timers.delete(id);},
    flushFrames(){
      const jobs=[...frames.values()];
      frames.clear();
      for(const fn of jobs)fn();
    },
    flushTimers(){
      const jobs=[...timers.values()];
      timers.clear();
      for(const fn of jobs)fn();
    }
  };
}

function scheduler(c){
  return createCancellableFrameTaskScheduler({
    requestFrame:fn=>c.requestFrame(fn),
    cancelFrame:id=>c.cancelFrame(id),
    postTask:fn=>c.postTask(fn),
    cancelTask:id=>c.cancelTask(id)
  });
}

test("PERF-001: cancelled DWFx task does not survive the requestAnimationFrame stage",()=>{
  const c=clock(),s=scheduler(c),calls=[];
  const job=s.post(()=>calls.push("ran"));
  assert.equal(c.frames.size,1);
  assert.equal(s.cancel(job),true);
  assert.equal(s.cancel(job),false);
  assert.equal(c.frames.size,0);
  c.flushFrames();c.flushTimers();
  assert.deepEqual(calls,[]);
});

test("PERF-001: cancellation between rAF and timer removes the second-stage callback",()=>{
  const c=clock(),s=scheduler(c),calls=[];
  const job=s.post(()=>calls.push("ran"));
  c.flushFrames();
  assert.equal(c.timers.size,1);
  assert.equal(s.cancel(job),true);
  assert.equal(c.timers.size,0);
  c.flushTimers();
  assert.deepEqual(calls,[]);
});

test("PERF-001: obsolete callback checks cancellation even if host cancel is ineffective",()=>{
  const c=clock({ignoreCancel:true}),s=scheduler(c),calls=[];
  const job=s.post(()=>calls.push("stale"));
  c.flushFrames();
  assert.equal(s.cancel(job),true);
  c.flushTimers();
  assert.deepEqual(calls,[]);
});

test("PERF-001: normal DWFx batch executes exactly once and cannot be cancelled afterward",()=>{
  const c=clock(),s=scheduler(c),calls=[];
  const job=s.post(()=>calls.push("done"));
  c.flushFrames();c.flushTimers();
  assert.deepEqual(calls,["done"]);
  assert.equal(job.completed,true);
  assert.equal(s.cancel(job),false);
});

test("PERF-001: failed timer stage runs once without stalling the cooperative queue",()=>{
  const c=clock(),errors=[],calls=[];
  const s=createCancellableFrameTaskScheduler({
    requestFrame:fn=>c.requestFrame(fn),
    postTask:()=>{throw new Error("timer unavailable");},
    onError:e=>errors.push(e.message)
  });
  const job=s.post(()=>calls.push("fallback"));
  c.flushFrames();
  assert.deepEqual(calls,["fallback"]);
  assert.deepEqual(errors,["timer unavailable"]);
  assert.equal(job.completed,true);
});

test("PERF-001: standalone DWFx batches use a cancellable frame/timer handle",()=>{
  const builder=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.match(builder,/createCancellableFrameTaskScheduler\.toString\(\)/);
  assert.match(builder,/postTask:fn=>tbDwfTaskScheduler\.post\(fn\)/);
  assert.match(builder,/cancelTask:task=>tbDwfTaskScheduler\.cancel\(task\)/);
  assert.doesNotMatch(builder,/postTask:fn=>requestAnimationFrame\(\(\)=>setTimeout\(fn,0\)\)/);
});
