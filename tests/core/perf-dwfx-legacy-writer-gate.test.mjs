import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const legacy=new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url);
const ui=new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url);

test("legacy history and project opening replace mutable project data",()=>{
  const html=fs.readFileSync(legacy,"utf8");
  assert.match(html,/function tbHistoryRestore\(snapshot\)/);
  assert.match(html,/state=clone\(snapshot\.state\)/);
  assert.match(html,/function tbUndo\(\)/);
  assert.match(html,/function tbRedo\(\)/);
  assert.match(html,/function poExecuteOpen\(/);
  assert.match(html,/projects:chosen/);
  assert.match(html,/state\.projects\.push\(p\)/);
});

test("serialized DWFx flag cannot certify revision-only cache reuse",()=>{
  const source=fs.readFileSync(ui,"utf8");
  assert.match(source,/const runtimeTrackedProjects=new WeakSet\(\)/);
  assert.match(source,/project\?\.dwfx_revision_tracking_complete===true&&\s*runtimeTrackedProjects\.has\(project\)/);
  assert.doesNotMatch(source,/runtimeTrackedProjects\.add\(/,
    "authorization remains disabled until legacy writers are audited");
});
