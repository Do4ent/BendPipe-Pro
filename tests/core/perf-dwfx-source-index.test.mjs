import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");

class Group {
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
    this.children=this.children.filter(entry=>entry!==child);
    child.parent=null;
  }
  clear(){for(const child of this.children)child.parent=null;this.children=[];}
  updateMatrixWorld(){}
}

function harness({inspect=false,selectionEntries=[]}={}){
  const window={TubeBenderObjectContext:{selectionEntries:()=>selectionEntries}};
  const code=inspect
    ? source.replace(
        "  window.TubeBenderReferenceSceneUi=Object.freeze({",
        "  window.__testSourceIndex=buildSourceRenderIndex;\n  window.TubeBenderReferenceSceneUi=Object.freeze({"
      )
    : source;
  vm.runInNewContext(code,{window,setTimeout,clearTimeout,globalThis:{}});
  const tasks=[];
  const options=project=>({
    project,THREE:{Group},geomScale:1,batchSize:4,
    postTask(fn){tasks.push(fn);return tasks.length;},cancelTask(){}
  });
  const drain=()=>{
    let steps=0;
    while(tasks.length){
      assert.ok(++steps<2000,"scene processing should complete");
      tasks.shift()();
    }
  };
  return {api:window.TubeBenderReferenceSceneUi,window,options,drain};
}

test("PERF-001: reference scene link index is built once across many cooperative roots",()=>{
  const {api,options,drain}=harness();
  let sourceReads=0;
  const tubes=Array.from({length:600},(_,index)=>{
    const importState={source_link:index===0
      ? {scene_id:"scene",node_id:"node0",display:"hidden"}
      : null};
    return {
      id:"tube"+index,
      rows:[{length:10}],
      get currentProjectImport(){sourceReads++;return importState;}
    };
  });
  const project={tubes,referenceScenes:[{
    id:"scene",visible:true,
    display_runtime:{scene_id:"scene",assets:[],scale_mm_per_source_unit:1},
    tree:Array.from({length:48},(_,index)=>({
      id:"node"+index,geometry_instances:[],
      children:Array.from({length:3},(_,child)=>({
        id:"child"+index+"-"+child,geometry_instances:[],children:[]
      }))
    }))
  }]};
  const opts=options(project);
  const first=api.render3DCooperative({...opts,parent:new Group()});
  drain();
  assert.equal(first.status.committed,true);
  assert.equal(first.status.failures,0);
  assert.equal(api.sceneReuseStats().sourceIndexBuilds,1);
  assert.ok(sourceReads<600*12,
    "per-node rescans should not multiply source-link property reads");

  project.tubes[0].rows[0].length=73;
  const unchanged=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(unchanged.status.reused,true,
    "initial runtime registration must not poison the first cached signature");
  assert.equal(api.sceneReuseStats().sourceIndexBuilds,1);

  const revisions=JSON.stringify(api.revisionSnapshot());
  project.tubes[0].currentProjectImport.source_link.display="shown";
  const changed=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(changed.status.reused,undefined,
    "legacy source-link changes without revision bumps must invalidate reuse");
  drain();
  assert.equal(changed.status.committed,true);
  assert.equal(api.sceneReuseStats().sourceIndexBuilds,2);
  assert.equal(JSON.stringify(api.revisionSnapshot()),revisions);
});

test("PERF-001: index preserves first-match semantics, detached links and mesh selection",()=>{
  const selection=[
    {kind:"tube",tubeId:"active"},
    {kind:"mesh-instance",instanceId:"m2"}
  ];
  const {window}=harness({inspect:true,selectionEntries:selection});
  assert.equal(typeof window.__testSourceIndex,"function");
  const project={
    tubes:[
      {id:"detached",partNumber:"P",currentProjectImport:{
        source_link:{scene_id:"s",node_id:"n",detached:true}}},
      {id:"active",currentProjectImport:{
        source_link:{scene_id:"s",node_id:"n",display:"compare"}}}
    ],
    editable_mesh_instances:[
      {id:"m1",link_status:"linked",source:{scene_id:"s",node_id:"n"}},
      {id:"skipped",link_status:"detached",source:{scene_id:"s",node_id:"n"}},
      {id:"m2",link_status:"linked",source:{scene_id:"s",node_id:"n"}},
      {id:"other-scene",link_status:"linked",source:{scene_id:"t",node_id:"n"}}
    ]
  };
  const index=window.__testSourceIndex(project,"s");
  assert.equal(index.firstAny.get("n")?.id,"detached");
  assert.equal(index.firstLinked.get("n")?.id,"active");
  assert.equal(index.meshByNode.get("n")?.length,2);
  assert.equal(index.meshByNode.get("n")[0].id,"m1");
  assert.equal(index.meshByNode.get("n")[1].id,"m2");
  assert.equal(index.selectedTubeIds.has("active"),true);
  assert.equal(index.selectedInstanceIds.has("m2"),true);
  assert.equal(index.editableParts.has("P"),true);
});
