import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("PERF-001: DWFx signature reports link traversal and serialization separately",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const window={};
  let clock=0;
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{},performance:{now:()=>++clock}});
  class Group{
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(item=>item!==child);child.parent=null;}
    clear(){this.children=[];}
    updateMatrixWorld(){}
  }
  const api=window.TubeBenderReferenceSceneUi;
  const project={tubes:[{id:"tube",currentProjectImport:{source_link:{scene_id:"scene",node_id:"root"}}}],
    referenceScenes:[{id:"scene",visible:true,display_runtime:{scene_id:"scene",assets:[],scale_mm_per_source_unit:1},
      tree:[{id:"root",geometry_instances:[],children:[]}]}]};
  const tasks=[],opts={project,THREE:{Group},geomScale:1,
    postTask:fn=>{tasks.push(fn);return tasks.length;},cancelTask(){}};
  const first=api.render3DCooperative({...opts,parent:new Group()});
  while(tasks.length)tasks.shift()();
  assert.equal(first.status.committed,true);
  const second=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(second.status.reused,true);
  const stats=api.sceneReuseStats();
  assert.equal(stats.signatureCalls,3,"initial build now revalidates before commit");
  assert.equal(stats.lastLinksTimeMs,1);
  assert.equal(stats.lastSerializeTimeMs,1);
  assert.equal(stats.lastSignatureTimeMs,2);
  assert.equal(stats.hits,1);
});
