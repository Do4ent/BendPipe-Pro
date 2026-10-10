import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("cooperative DWFx cache rebuilds after in-place evidence part-number edit",()=>{
  const window={};
  const code=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  vm.runInNewContext(code,{window,setTimeout,clearTimeout,globalThis:{}});
  const ui=window.TubeBenderReferenceSceneUi;
  class Group{
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(item=>item!==child);child.parent=null;}
    clear(){for(const child of this.children)child.parent=null;this.children=[];}
    updateMatrixWorld(){}
  }
  const THREE={Group};
  const project={
    tubes:[{id:"tube",partNumber:"P",part_number:"L",importEvidence:{part_number:"E"},
      currentProjectImport:{part_number:"I"},rows:[{length:10}]}],
    referenceScenes:[{id:"scene",visible:true,
      display_runtime:{scene_id:"scene",assets:[],scale_mm_per_source_unit:1},
      tree:[{id:"root",geometry_instances:[],children:[]}]}],
    editable_mesh_instances:[]
  };
  const tasks=[];
  const options={project,THREE,geomScale:1,postTask:fn=>{tasks.push(fn);return tasks.length;},cancelTask(){}};
  const drain=()=>{while(tasks.length)tasks.shift()();};
  const first=ui.render3DCooperative({...options,parent:new Group()});
  drain();
  assert.equal(first.status.committed,true);
  const reused=ui.render3DCooperative({...options,parent:new Group()});
  assert.equal(reused.status.reused,true);
  project.tubes[0].importEvidence.part_number="E2";
  const changed=ui.render3DCooperative({...options,parent:new Group()});
  assert.equal(changed.status.reused,undefined,"in-place evidence edit must miss cache");
  drain();
  assert.equal(changed.status.committed,true);
  project.tubes[0].rows[0].length=90;
  const unrelated=ui.render3DCooperative({...options,parent:new Group()});
  assert.equal(unrelated.status.reused,true,"ordinary bending edits still reuse source scene");
  const stats=ui.sceneReuseStats();
  assert.equal(stats.hits,2);
  assert.equal(stats.misses,2);
});
