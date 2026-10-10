import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function makeUi(){
  const window={};
  vm.runInNewContext(fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"),
    {window,setTimeout,clearTimeout,globalThis:{}});
  return window.TubeBenderReferenceSceneUi;
}

test("DWFx revisions track geometry, display and selection independently",()=>{
  const ui=makeUi(),before=ui.revisionSnapshot();
  ui.registerRuntime({scene_id:"test",assets:[],scale_mm_per_source_unit:1});
  const afterGeometry=ui.revisionSnapshot();
  assert.equal(afterGeometry.geometry,before.geometry+1);
  assert.equal(afterGeometry.display,before.display);
  ui.clearSelection();
  assert.equal(ui.revisionSnapshot().selection,before.selection+1);
  ui.markSceneChanged({}, "display");
  assert.equal(ui.revisionSnapshot().display,before.display+1);
  assert.ok(ui.sceneReuseStats().invalidations>=1);
  assert.throws(()=>ui.markSceneChanged({},"unknown"),/Unknown DWFx revision kind/);
});
test("explicit source mutation increments revision and invalidates cached scene",()=>{
  const ui=makeUi(),before=ui.revisionSnapshot();
  ui.markSceneChanged({referenceScenes:[]}, "geometry");
  assert.equal(ui.revisionSnapshot().geometry,before.geometry+1);
  assert.equal(ui.sceneReuseStats().invalidations,1);
});
