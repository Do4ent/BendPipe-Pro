import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function environment(){
  const window={};
  vm.runInNewContext(fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"),
    {window,setTimeout,clearTimeout,globalThis:{}});
  class Group {
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(x=>x!==child);child.parent=null;}
    clear(){for(const child of this.children)child.parent=null;this.children=[];}
  }
  const tasks=new Map();let next=0;
  const postTask=callback=>{tasks.set(++next,callback);return next;};
  const cancelTask=id=>tasks.delete(id);
  const tick=()=>{const steps=[...tasks.values()];tasks.clear();steps.forEach(fn=>fn());};
  const mkProject=id=>({referenceScenes:[{id,display_runtime:{scene_id:id,assets:[],scale_mm_per_source_unit:1},
    tree:Array.from({length:5},(_,i)=>({id:id+i,children:[],geometry_instances:[]}))}]});
  return {api:window.TubeBenderReferenceSceneUi,Group,THREE:{Group},postTask,cancelTask,tick,mkProject};
}

test("progressive mode exposes only finished batches between scheduled tasks",()=>{
  const e=environment(),parent=new e.Group(),progress=[];
  const handle=e.api.render3DCooperative({parent,project:e.mkProject("first"),THREE:e.THREE,
    batchSize:2,progressive:true,postTask:e.postTask,cancelTask:e.cancelTask,
    onProgress:state=>progress.push(state.processed)});
  assert.equal(parent.children.length,0);
  e.tick();assert.equal(parent.children.length,1);
  assert.deepEqual(progress,[2]);
  assert.equal(handle.status.committed,false);
  e.tick();assert.deepEqual(progress,[2,4]);
  e.tick();assert.equal(handle.status.committed,true);
  assert.deepEqual(progress,[2,4],"final frame commits once");
});
test("switching projects removes in-progress GPU scene group",()=>{
  const e=environment(),parent=new e.Group();
  const options={parent,THREE:e.THREE,batchSize:1,progressive:true,
    postTask:e.postTask,cancelTask:e.cancelTask};
  const first=e.api.render3DCooperative({...options,project:e.mkProject("old")});
  e.tick();assert.equal(parent.children.length,1);
  const second=e.api.render3DCooperative({...options,project:e.mkProject("new")});
  assert.equal(first.status.committed,false);
  assert.equal(parent.children.length,0,"stale partial geometry removed");
  for(let i=0;i<6;i++)e.tick();
  assert.equal(second.status.committed,true);
  assert.equal(parent.children.length,1);
});
test("standalone build wires frame-paced progress callback to WebGL",()=>{
  const source=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.match(source,/batchSize:8,progressive:true/);
  assert.match(source,/onProgress:\(\)=>/);
  assert.match(source,/postTask:fn=>tbDwfTaskScheduler\.post\(fn\)/);
  assert.match(source,/cancelTask:task=>tbDwfTaskScheduler\.cancel\(task\)/);
});
