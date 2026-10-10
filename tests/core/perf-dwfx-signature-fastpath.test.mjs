import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function signatureHarness(selectionEntries=()=>[]){
  const source=fs.readFileSync(
    new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"
  );
  const start=source.indexOf("  function referenceSignature(project,geomScale){");
  const end=source.indexOf("\n  // Preserve shared imported scene",start);
  assert.ok(start>=0&&end>start,"reference signature implementation present");
  const context={
    bulkSelected:new Set(),
    window:{TubeBenderObjectContext:{selectionEntries}},
    revisionSnapshot:()=>({geometry:2,display:3,selection:4}),
  };
  return vm.runInNewContext(
    "const runtimeTrackedProjects=new WeakSet();\n"+source.slice(start,end)+"\nreferenceSignature",context
  );
}

test("persisted tracking flag alone cannot bypass conservative source signature",()=>{
  const key=signatureHarness();
  const project={
    dwfx_revision_tracking_complete:true,
    referenceScenes:[{id:"scene-1"}],tubes:[],editable_mesh_instances:[]
  };
  const before=key(project,1);
  project.referenceScenes[0].id="scene-2";
  assert.notEqual(key(project,1),before);
});

test("legacy DWFx project retains the deep source signature",()=>{
  const key=signatureHarness();
  const project={
    referenceScenes:[{id:"scene-1",tree:[{id:"part-1"}]}],
    tubes:[{id:"t1",currentProjectImport:{source_link:{scene_id:"scene-1"}}}],
    editable_mesh_instances:[]
  };
  const before=key(project,1);
  project.referenceScenes[0].tree[0].id="part-2";
  assert.notEqual(key(project,1),before);
});

test("external selection remains included in conservative signature",()=>{
  let selected=[];
  const key=signatureHarness(()=>selected);
  const project={dwfx_revision_tracking_complete:true,referenceScenes:[],tubes:[]};
  const before=key(project,1);
  selected=[{kind:"mesh",instanceId:"mesh-1"}];
  assert.notEqual(key(project,1),before);
});
