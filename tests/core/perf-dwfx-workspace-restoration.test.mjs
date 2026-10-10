import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const legacyFile=new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url);
function makeApi(){
  const window={};
  vm.runInNewContext(fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8"),{
    window,globalThis:{},setTimeout,clearTimeout,queueMicrotask
  });
  return window.TubeBenderReferenceSceneUi;
}
test("workspace replacement drops orphan DWFx runtimes and permits new IDs",()=>{
  const api=makeApi();
  api.registerRuntime({scene_id:"removed-scene",assets:[{id:"old"}]});
  const before=api.revisionSnapshot().geometry;
  const count=api.replacePersistedRuntimes([{referenceScenes:[
    {id:"new-scene",display_runtime:{scene_id:"new-scene",assets:[{id:"new"}]}}
  ]}]);
  assert.equal(count,1);
  assert.deepEqual(JSON.parse(JSON.stringify(api.runtimeSummary())),[
    {scene_id:"new-scene",asset_count:1}
  ]);
  assert.ok(api.revisionSnapshot().geometry>before);
});
test("empty workspace replacement removes all source runtime assets",()=>{
  const api=makeApi();
  api.registerRuntime({scene_id:"old",assets:[]});
  assert.equal(api.replacePersistedRuntimes([]),0);
  assert.equal(api.runtimeSummary().length,0);
});
test("legacy undo/redo, workspace open, editable copy invalidate DWFx through one handler",()=>{
  const html=fs.readFileSync(legacyFile,"utf8");
  for(const reason of ["history-restore","project-open","project-copy"]){
    assert.ok(html.includes('tbNotifyDwfxSceneChange("'+reason+'")'),reason);
  }
  const handler=html.slice(html.indexOf("function tbNotifyDwfxSceneChange("),html.indexOf("function tbHistoryRestore("));
  assert.match(handler,/replacePersistedRuntimes\(state\.projects\?\?\[\]\)/);
});
