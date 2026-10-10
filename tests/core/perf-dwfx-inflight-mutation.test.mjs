import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

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
  remove(child){
    this.children=this.children.filter(item=>item!==child);
    child.parent=null;
  }
  clear(){
    for(const child of this.children)child.parent=null;
    this.children=[];
  }
  updateMatrixWorld(){}
}
function setup(){
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  const jobs=[],events={commit:0,stale:0,progress:0};
  const project={
    tubes:[{id:"t",rows:[{length:10}],currentProjectImport:{
      source_link:{scene_id:"s",node_id:"root0",display:"hidden"}
    }}],
    referenceScenes:[{
      id:"s",visible:true,
      display_runtime:{scene_id:"s",assets:[],scale_mm_per_source_unit:1},
      tree:Array.from({length:5},(_,index)=>({
        id:"root"+index,geometry_instances:[],children:[]
      }))
    }]
  };
  const parent=new Group(),api=window.TubeBenderReferenceSceneUi;
  const render=()=>api.render3DCooperative({
    parent,project,THREE:{Group},geomScale:1,progressive:true,batchSize:1,
    postTask(fn){jobs.push(fn);return jobs.length;},cancelTask(){},
    onProgress(){events.progress++;},
    onCommit(){events.commit++;},
    onStale(){events.stale++;}
  });
  const next=()=>{assert.ok(jobs.length>0,"expected queued cooperative step");jobs.shift()();};
  const drain=()=>{let n=0;while(jobs.length){
    assert.ok(++n<30,"cooperative queue failed to terminate");next();
  }};
  return {api,project,parent,events,render,next,drain};
}

test("PERF-001: unversioned legacy source edit during progressive build cannot enter the completed cache",()=>{
  const h=setup(),first=h.render();
  h.next();
  assert.equal(h.parent.children.length,1,"progressive batch attached");
  h.project.tubes[0].currentProjectImport.source_link.display="compare";
  h.drain();
  assert.equal(first.status.stale,true);
  assert.equal(first.status.committed,false);
  assert.equal(first.status.pending,false);
  assert.equal(h.parent.children.length,0,"stale progressive scene must be detached");
  assert.equal(h.events.commit,0);
  assert.equal(h.events.stale,1);
  assert.equal(h.api.sceneReuseStats().staleBuilds,1);
  const fresh=h.render();
  h.drain();
  assert.equal(fresh.status.committed,true);
  assert.equal(fresh.status.stale,false);
  assert.equal(h.events.commit,1);
});

test("PERF-001: revision change rejects in-flight scene before the next progressive batch",()=>{
  const h=setup(),first=h.render();
  h.next();
  assert.equal(h.events.progress,1);
  h.api.selectScene(h.project,"s",true);
  h.next();
  assert.equal(first.status.stale,true);
  assert.equal(h.events.stale,1);
  assert.equal(h.events.progress,1,"no additional stale progressive paint");
  assert.equal(h.parent.children.length,0);
  assert.equal(h.api.sceneReuseStats().signatureCalls,1,
    "revision test must avoid expensive signature regeneration");
  h.drain();
  assert.equal(h.events.stale,1);
});

test("PERF-001: explicit DWFx source invalidation immediately requests recovery once",()=>{
  const h=setup(),first=h.render();
  h.next();
  h.api.markSceneChanged(h.project,"display");
  assert.equal(first.status.stale,true);
  assert.equal(h.events.stale,1);
  assert.equal(h.parent.children.length,0);
  h.drain();
  assert.equal(h.events.stale,1,"cancelled queued tasks must not send more retries");
  const fresh=h.render();
  h.drain();
  assert.equal(fresh.status.committed,true);
});

test("PERF-001: ordinary tube parameter edit during build does not discard immutable DWFx source",()=>{
  const h=setup(),first=h.render();
  h.next();
  h.project.tubes[0].rows[0].length=99;
  h.drain();
  assert.equal(first.status.stale,false);
  assert.equal(first.status.committed,true);
  assert.equal(h.events.stale,0);
  assert.equal(h.events.commit,1);
  assert.equal(h.parent.children.length,1);
});
