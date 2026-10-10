import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function signatureHarness(){
  const source=fs.readFileSync(
    new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"
  );
  const start=source.indexOf("  function referenceSignature(project,geomScale){");
  const end=source.indexOf("\n  // Preserve shared imported scene",start);
  assert.ok(start>=0&&end>start,"reference signature implementation present");
  const context={
    bulkSelected:new Set(),
    window:{TubeBenderObjectContext:{selectionEntries:()=>[]}},
    revisionSnapshot:()=>({geometry:2,display:3,selection:4}),
  };
  return vm.runInNewContext(
    source.slice(start,end)+"\nreferenceSignature",context
  );
}

test("tracked DWFx project uses revision key without traversing source scene",()=>{
  const key=signatureHarness();
  const project={dwfx_revision_tracking_complete:true};
  Object.defineProperty(project,"referenceScenes",{
    get(){throw new Error("scene tree was traversed");}
  });
  Object.defineProperty(project,"tubes",{
    get(){throw new Error("tube links were traversed");}
  });
  const parsed=JSON.parse(key(project,1));
  assert.equal(parsed.mode,"tracked");
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.revisions)),{
    geometry:2,display:3,selection:4
  });
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
