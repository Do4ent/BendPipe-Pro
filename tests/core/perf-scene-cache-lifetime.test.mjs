import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("runtime replacement explicitly invalidates DWFx scene reuse",()=>{
  const window={};
  vm.runInNewContext(fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"),
    {window,setTimeout,clearTimeout,globalThis:{}});
  class Group {
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(o){if(o.parent)o.parent.remove(o);this.children.push(o);o.parent=this;}
    remove(o){this.children=this.children.filter(x=>x!==o);o.parent=null;}
    clear(){this.children=[];}
  }
  const THREE={Group},api=window.TubeBenderReferenceSceneUi,tasks=[];
  const project={referenceScenes:[{id:"test",tree:[{id:"root",children:[],geometry_instances:[]}],
    display_runtime:{scene_id:"test",assets:[],scale_mm_per_source_unit:1}}]};
  const opts={project,THREE,postTask:fn=>tasks.push(fn),cancelTask(){}};
  const parent=new Group(),first=api.render3DCooperative({...opts,parent});
  while(tasks.length)tasks.shift()();
  assert.equal(first.status.committed,true);
  const reused=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(reused.status.reused,true);
  api.registerRuntime({scene_id:"test",assets:[],scale_mm_per_source_unit:1});
  const rebuilt=api.render3DCooperative({...opts,parent:new Group()});
  assert.equal(rebuilt.status.reused,undefined);
  while(tasks.length)tasks.shift()();
  assert.equal(rebuilt.status.committed,true);
  api.invalidateSceneCache();
  assert.ok(api.sceneReuseStats().invalidations>=2);
});
