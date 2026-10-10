import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("completed DWFx scene detaches before parent disposal and is reusable",()=>{
  const window={};
  vm.runInNewContext(fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"),
    {window,setTimeout,clearTimeout,globalThis:{}});
  class Group {
    constructor(){this.children=[];this.parent=null;this.userData={};this.scale={setScalar(){}};}
    add(child){if(child.parent)child.parent.remove(child);this.children.push(child);child.parent=this;}
    remove(child){this.children=this.children.filter(item=>item!==child);child.parent=null;}
    clear(){for(const child of this.children)child.parent=null;this.children=[];}
  }
  const THREE={Group},api=window.TubeBenderReferenceSceneUi,tasks=[];
  const project={referenceScenes:[{id:"ref",tree:[{id:"root",children:[],geometry_instances:[]}],
    display_runtime:{scene_id:"ref",assets:[],scale_mm_per_source_unit:1}}]};
  const original=new Group();
  const old=api.render3DCooperative({parent:original,project,THREE,postTask:fn=>tasks.push(fn),cancelTask(){}});
  while(tasks.length)tasks.shift()();
  assert.equal(old.status.committed,true);
  assert.equal(original.children.length,1);
  assert.equal(api.beforeParentDispose(original),true);
  assert.equal(original.children.length,0);
  assert.equal(old.group.parent,null);
  const nextParent=new Group();
  const reused=api.render3DCooperative({parent:nextParent,project,THREE,postTask:fn=>tasks.push(fn),cancelTask(){}});
  assert.equal(reused.status.reused,true);
  assert.equal(nextParent.children.length,1);
  assert.equal(tasks.length,0);
  assert.equal(api.beforeParentDispose(new Group()),false);
});
test("standalone builder detaches reference cache before old geometry disposal",()=>{
  const source=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.ok(source.includes("beforeParentDispose"));
});
