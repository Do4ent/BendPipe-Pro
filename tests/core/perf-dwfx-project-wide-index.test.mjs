import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");

class Group{
  constructor(){
    this.children=[];this.parent=null;this.userData={};
    this.scale={setScalar(){}};
    this.position={set(){}};
  }
  add(child){
    if(child.parent)child.parent.remove(child);
    this.children.push(child);child.parent=this;
  }
  remove(child){
    this.children=this.children.filter(item=>item!==child);
    child.parent=null;
  }
  clear(){for(const item of this.children)item.parent=null;this.children=[];}
  updateMatrixWorld(){}
}

function harness(){
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  const jobs=[];
  const opts=(project)=>({
    project,THREE:{Group},geomScale:1,batchSize:5,
    postTask(fn){jobs.push(fn);return jobs.length;},
    cancelTask(){}
  });
  const drain=()=>{
    let iterations=0;
    while(jobs.length){
      assert.ok(++iterations<2000,"cooperative queue must finish");
      jobs.shift()();
    }
  };
  return {api:window.TubeBenderReferenceSceneUi,opts,drain};
}

test("PERF-001: source lookups are indexed once for multiple DWFx scenes",()=>{
  const {api,opts,drain}=harness();
  let sourceReads=0;
  const tubes=Array.from({length:700},(_,index)=>{
    const importData={
      source_link:index<5
        ? {scene_id:"scene"+index,node_id:"root0",display:"hidden"}
        : null
    };
    return {
      id:"tube"+index,rows:[{length:10}],
      get currentProjectImport(){sourceReads++;return importData;}
    };
  });
  const project={tubes,referenceScenes:Array.from({length:5},(_,index)=>({
    id:"scene"+index,visible:true,
    display_runtime:{scene_id:"scene"+index,assets:[],scale_mm_per_source_unit:1},
    tree:Array.from({length:25},(_,node)=>({
      id:"root"+node,geometry_instances:[],children:[]
    }))
  }))};
  const args=opts(project);
  const first=api.render3DCooperative({...args,parent:new Group()});
  drain();
  assert.equal(first.status.committed,true);
  assert.equal(first.status.processed,125);
  assert.equal(first.status.failures,0);
  assert.equal(api.sceneReuseStats().sourceIndexBuilds,1);
  assert.ok(sourceReads<7000,
    "each new DWFx scene must not trigger another full scan of all tubes");

  project.tubes[0].rows[0].length=99;
  const repeat=api.render3DCooperative({...args,parent:new Group()});
  assert.equal(repeat.status.reused,true);
  assert.equal(api.sceneReuseStats().sourceIndexBuilds,1);

  const before=JSON.stringify(api.revisionSnapshot());
  project.tubes[0].currentProjectImport.source_link.display="compare";
  const changed=api.render3DCooperative({...args,parent:new Group()});
  assert.notEqual(changed.status.reused,true);
  drain();
  assert.equal(changed.status.committed,true);
  assert.equal(api.sceneReuseStats().sourceIndexBuilds,2);
  assert.equal(JSON.stringify(api.revisionSnapshot()),before,
    "legacy direct mutations must be detected without revision increments");
});

test("PERF-001: synchronous renderer also shares one cross-scene lookup",()=>{
  const {api}=harness();
  const project={tubes:[],referenceScenes:Array.from({length:3},(_,i)=>({
    id:"scene"+i,visible:true,
    display_runtime:{scene_id:"scene"+i,assets:[],scale_mm_per_source_unit:1},
    tree:[{id:"root",geometry_instances:[],children:[]}]
  }))};
  const count=api.render3D({parent:new Group(),project,THREE:{Group},geomScale:1});
  assert.equal(count,3);
  assert.equal(api.sceneReuseStats().sourceIndexBuilds,1);
});
