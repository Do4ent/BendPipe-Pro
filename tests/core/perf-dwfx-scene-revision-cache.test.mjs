import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("tube length edit reuses built DWFx scene; source visibility invalidates it",()=>{
  const window={};
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  class Group{
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(x=>x!==child);child.parent=null;}
    clear(){for(const child of this.children)child.parent=null;this.children=[];}
    updateMatrixWorld(){}
  }
  const THREE={Group},api=window.TubeBenderReferenceSceneUi;
  const project={tubes:[{id:"tube",rows:[{length:10}]}],referenceScenes:[{
    id:"scene",visible:true,display_runtime:{scene_id:"scene",assets:[],scale_mm_per_source_unit:1},
    tree:[{id:"root",geometry_instances:[],children:[]}]
  }]};
  const tasks=[];
  const opts={project,THREE,geomScale:1,postTask:fn=>{tasks.push(fn);return tasks.length;},cancelTask(){}};
  const drain=()=>{while(tasks.length)tasks.shift()();};
  const firstParent=new Group();
  const first=api.render3DCooperative({...opts,parent:firstParent});drain();
  assert.equal(first.status.committed,true);
  project.tubes[0].rows[0].length=80;
  const secondParent=new Group();
  const second=api.render3DCooperative({...opts,parent:secondParent});
  assert.equal(second.status.reused,true);
  assert.equal(tasks.length,0,"cache hit bypasses scheduled reference-tree build");
  assert.equal(second.group,first.group);
  assert.equal(firstParent.children.length,0);
  assert.equal(secondParent.children.length,1);
  project.referenceScenes[0].hiddenNodeIds=["root"];
  const third=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(third.status.committed,false,"source presentation edit invalidates cache");
  drain();
  assert.equal(third.status.committed,true);
  const stats=api.sceneReuseStats();
  assert.equal(stats.hits,1);
  assert.equal(stats.misses,2);
});
