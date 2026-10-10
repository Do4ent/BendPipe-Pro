import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("PERF-001: empty reference project does not serialize large tube arrays",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  class Group{
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(item=>item!==child);child.parent=null;}
    clear(){for(const child of this.children)child.parent=null;this.children=[];}
    updateMatrixWorld(){}
  }
  const api=window.TubeBenderReferenceSceneUi;
  const project={referenceScenes:[],tubes:Array.from({length:10000},(_,i)=>({
    id:String(i),currentProjectImport:{source_link:{node_id:String(i)}}
  }))};
  const jobs=[];
  const opts={project,THREE:{Group},geomScale:1,postTask:fn=>{jobs.push(fn);return jobs.length;},cancelTask(){}};
  const first=api.render3DCooperative({...opts,parent:new Group()});
  while(jobs.length)jobs.shift()();
  assert.equal(first.status.committed,true);
  const second=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(second.status.reused,true);
  const stats=api.sceneReuseStats();
  assert.equal(stats.emptyFastPaths,2);
  assert.equal(stats.signatureCalls,0);
  project.referenceScenes=[{id:"new",visible:true,display_runtime:{
    scene_id:"new",assets:[],scale_mm_per_source_unit:1
  },tree:[{id:"root",geometry_instances:[],children:[]}]}];
  const next=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(next.status.reused,undefined,"adding reference geometry invalidates empty fast path");
  assert.equal(api.sceneReuseStats().signatureCalls,1);
});
