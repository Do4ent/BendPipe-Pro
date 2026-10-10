import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {createCancellableFrameTaskScheduler} from "../../src/domain/performance/render-startup.mjs";

const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");

class Group{
  constructor(){
    this.children=[];this.parent=null;this.userData={};
    this.scale={setScalar(){}};this.position={set(){}};
  }
  add(child){
    if(child.parent)child.parent.remove(child);
    this.children.push(child);child.parent=this;
  }
  remove(child){this.children=this.children.filter(x=>x!==child);child.parent=null;}
  clear(){for(const child of this.children)child.parent=null;this.children=[];}
  updateMatrixWorld(){}
}

function setup(){
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  const frames=new Map(),timers=new Map();
  let nextFrame=0,nextTimer=0;
  const scheduler=createCancellableFrameTaskScheduler({
    requestFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},
    cancelFrame:id=>frames.delete(id),
    postTask:fn=>{const id=++nextTimer;timers.set(id,fn);return id;},
    cancelTask:id=>timers.delete(id)
  });
  const project={
    tubes:[{id:"tube",rows:[{length:10}]}],
    referenceScenes:[{
      id:"scene",visible:true,
      display_runtime:{scene_id:"scene",assets:[],scale_mm_per_source_unit:1},
      tree:Array.from({length:7},(_,i)=>({id:"root"+i,geometry_instances:[],children:[]}))
    }]
  };
  const events={committed:[],stale:0};
  const render=label=>window.TubeBenderReferenceSceneUi.render3DCooperative({
    parent:new Group(),project,THREE:{Group},geomScale:1,batchSize:2,
    postTask:fn=>scheduler.post(fn),
    cancelTask:handle=>scheduler.cancel(handle),
    onCommit:()=>events.committed.push(label),
    onStale:()=>events.stale++
  });
  const flushFrames=()=>{
    const pending=[...frames.values()];
    frames.clear();
    for(const fn of pending)fn();
  };
  const flushTimers=()=>{
    const pending=[...timers.values()];
    timers.clear();
    for(const fn of pending)fn();
  };
  const drain=()=>{
    let turns=0;
    while(frames.size||timers.size){
      assert.ok(++turns<50,"deferred tasks should complete");
      flushFrames();flushTimers();
    }
  };
  return {project,frames,timers,events,render,flushFrames,flushTimers,drain};
}

test("PERF-001: a new DWFx render cancels an obsolete queued animation frame",()=>{
  const h=setup();
  const first=h.render("old");
  assert.equal(h.frames.size,1);
  h.project.tubes[0].rows[0].length=19;
  const second=h.render("latest");
  assert.equal(h.frames.size,1,"old rAF must be cancelled before new work");
  assert.equal(first.status.committed,false);
  h.drain();
  assert.equal(second.status.committed,true);
  assert.deepEqual(h.events.committed,["latest"]);
  assert.equal(h.events.stale,0,"ordinary supersession does not trigger recovery");
});

test("PERF-001: a new DWFx render cancels an obsolete queued timer after rAF",()=>{
  const h=setup();
  const first=h.render("old");
  h.flushFrames();
  assert.equal(h.timers.size,1);
  h.project.tubes[0].rows[0].length=55;
  const second=h.render("latest");
  assert.equal(h.timers.size,0,"old timer must be cancelled immediately");
  assert.equal(h.frames.size,1);
  h.drain();
  assert.equal(first.status.committed,false);
  assert.equal(second.status.committed,true);
  assert.deepEqual(h.events.committed,["latest"]);
  assert.equal(h.events.stale,0);
});
