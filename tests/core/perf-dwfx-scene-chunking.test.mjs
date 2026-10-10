import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function harness(){
  const window={};
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  class Group{
    constructor(){this.children=[];this.userData={};this.scale={setScalar(){}};}
    add(item){this.children.push(item);}
    clear(){this.children=[];}
  }
  const THREE={Group};
  const jobs=new Map();let next=0;
  const postTask=fn=>{jobs.set(++next,fn);return next;};
  const cancelTask=id=>jobs.delete(id);
  const tick=()=>{const x=[...jobs.values()];jobs.clear();x.forEach(fn=>fn());};
  return {api:window.TubeBenderReferenceSceneUi,THREE,Group,jobs,postTask,cancelTask,tick};
}
test("DWFx branch geometry commits atomically after multiple task batches",()=>{
  const h=harness(),parent=new h.Group(),commits=[];
  const project={referenceScenes:[{
    id:"one",display_runtime:{scene_id:"one",assets:[],scale_mm_per_source_unit:1},
    tree:Array.from({length:5},(_,i)=>({id:"node"+i,geometry_instances:[],children:[]}))
  }]};
  const handle=h.api.render3DCooperative({
    parent,project,THREE:h.THREE,batchSize:2,
    postTask:h.postTask,cancelTask:h.cancelTask,onCommit:s=>commits.push(s)
  });
  assert.equal(parent.children.length,0);
  h.tick();assert.equal(parent.children.length,0);
  h.tick();assert.equal(parent.children.length,0);
  h.tick();assert.equal(parent.children.length,1);
  assert.equal(handle.status.processed,5);
  assert.equal(handle.status.committed,true);
  assert.equal(commits.length,1);
});
test("DWFx cancellation and superseding project never commits stale geometry",()=>{
  const h=harness(),parent=new h.Group();
  const mkProject=id=>({referenceScenes:[{
    id,display_runtime:{scene_id:id,assets:[],scale_mm_per_source_unit:1},
    tree:[{id:"root",geometry_instances:[],children:[]}]
  }]});
  const first=h.api.render3DCooperative({parent,project:mkProject("a"),THREE:h.THREE,
    postTask:h.postTask,cancelTask:h.cancelTask});
  const second=h.api.render3DCooperative({parent,project:mkProject("b"),THREE:h.THREE,
    postTask:h.postTask,cancelTask:h.cancelTask});
  h.tick();
  assert.equal(first.status.committed,false);
  assert.equal(second.status.committed,true);
  assert.equal(parent.children.length,1);
});
