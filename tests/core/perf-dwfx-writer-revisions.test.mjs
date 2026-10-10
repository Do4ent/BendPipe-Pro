import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function harness(){
  const window={};
  vm.runInNewContext(fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"),
    {window,setTimeout,clearTimeout,globalThis:{}});
  return window.TubeBenderReferenceSceneUi;
}
test("native DWFx visibility and selection writers advance independent revisions",()=>{
  const ui=harness(),project={referenceScenes:[{id:"source",visible:true,
    tree:[{id:"first",children:[],geometry_instances:[]}]}]};
  const start=ui.revisionSnapshot();
  ui.showAll(project);
  assert.ok(ui.revisionSnapshot().display>start.display);
  ui.selectOnlyNode(project,"source","first");
  assert.ok(ui.revisionSnapshot().selection>start.selection);
  const display=ui.revisionSnapshot().display;
  ui.isolateSelection(project);
  assert.ok(ui.revisionSnapshot().display>display);
  const selection=ui.revisionSnapshot().selection;
  ui.clearSelection();
  assert.ok(ui.revisionSnapshot().selection>selection);
});
test("native mesh writer advances geometry revision",()=>{
  const ui=harness(),project={referenceScenes:[],editable_mesh_instances:[]};
  const start=ui.revisionSnapshot().geometry;
  ui.createEditableMeshInstance(project,{id:"scene"},{id:"node"});
  ui.moveEditableMeshInstance(project,project.editable_mesh_instances[0].id,{x:1,y:0,z:0});
  assert.ok(ui.revisionSnapshot().geometry>start);
});
test("conservative signature fallback remains for direct external source mutation",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  assert.match(source,/scenes:project\?\.referenceScenes/);
  assert.match(source,/JSON\.stringify\(/);
});
