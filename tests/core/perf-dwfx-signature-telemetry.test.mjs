import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("PERF-001: conservative DWFx signature timing is observable without changing reuse semantics",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  class Group{
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(item=>item!==child);child.parent=null;}
    clear(){this.children=[];}
    updateMatrixWorld(){}
  }
  const api=window.TubeBenderReferenceSceneUi;
  const project={tubes:[{id:"tube",rows:[{length:10}]}],referenceScenes:[{
    id:"scene",visible:true,
    display_runtime:{scene_id:"scene",assets:[],scale_mm_per_source_unit:1},
    tree:[{id:"node",geometry_instances:[],children:[]}]
  }]};
  const tasks=[],opts={project,THREE:{Group},geomScale:1,
    postTask:task=>{tasks.push(task);return tasks.length;},cancelTask(){}};
  const first=api.render3DCooperative({...opts,parent:new Group()});
  while(tasks.length)tasks.shift()();
  assert.equal(first.status.committed,true);
  project.tubes[0].rows[0].length=55;
  const second=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(second.status.reused,true);
  const stats=api.sceneReuseStats();
  assert.equal(stats.signatureCalls,3,"initial build now revalidates before commit");
  assert.equal(stats.hits,1);
  assert.equal(stats.misses,1);
  assert.ok(stats.lastSignatureBytes>0);
  assert.ok(Number.isFinite(stats.lastSignatureTimeMs));
  assert.ok(stats.maxSignatureTimeMs>=stats.lastSignatureTimeMs);
});
