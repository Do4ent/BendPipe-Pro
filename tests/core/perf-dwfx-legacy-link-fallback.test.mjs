import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("PERF-001: source link mutation invalidates nonempty DWFx reuse despite unchanged revision counters",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  class Group{
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(x=>x!==child);child.parent=null;}
    clear(){this.children=[];}
    updateMatrixWorld(){}
  }
  const api=window.TubeBenderReferenceSceneUi;
  const project={tubes:[{id:"t1",currentProjectImport:{source_link:{scene_id:"s",node_id:"root",display:"hidden"}}}],
    referenceScenes:[{id:"s",visible:true,display_runtime:{scene_id:"s",assets:[],scale_mm_per_source_unit:1},
      tree:[{id:"root",geometry_instances:[],children:[]}]}]};
  const jobs=[],opts={project,THREE:{Group},geomScale:1,
    postTask:fn=>{jobs.push(fn);return jobs.length;},cancelTask(){}};
  const first=api.render3DCooperative({...opts,parent:new Group()});
  while(jobs.length)jobs.shift()();
  assert.equal(first.status.committed,true);
  const before=api.revisionSnapshot();
  project.tubes[0].currentProjectImport.source_link.display="shown";
  const second=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(second.status.reused,undefined);
  assert.equal(second.status.committed,false);
  while(jobs.length)jobs.shift()();
  assert.equal(second.status.committed,true);
  assert.equal(JSON.stringify(api.revisionSnapshot()),JSON.stringify(before));
  assert.equal(api.sceneReuseStats().misses,2);
});
