import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync(
  new URL("../../legacy/VC207R7/TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html",import.meta.url),
  "utf8"
);
function between(start,end){
  const i=html.indexOf(start);
  assert.ok(i>=0,"Expected "+start);
  const j=html.indexOf(end,i+start.length);
  assert.ok(j>i,"Expected terminator "+end);
  return html.slice(i,j);
}
test("central notifier rehydrates DWFx runtimes or invalidates geometry",()=>{
  const body=between("function tbNotifyDwfxSceneChange(","function tbHistoryRestore(");
  assert.match(body,/TubeBenderReferenceSceneUi/);
  assert.match(body,/restorePersistedRuntimes\(project\)/);
  assert.match(body,/markSceneChanged\?\.\(activeProject\(\),"geometry"\)/);
});
test("undo and redo restoration notify before rendering",()=>{
  const body=between("function tbHistoryRestore(","function tbUndo(");
  assert.ok(body.indexOf('tbNotifyDwfxSceneChange("history-restore")')>body.indexOf("state=clone(snapshot.state)"));
  assert.ok(body.indexOf("renderAll()")>body.indexOf('tbNotifyDwfxSceneChange("history-restore")'));
});
test("project open and editable copy notify after state replacement",()=>{
  const open=between("async function poExecuteOpen(","function poDownloadReport(");
  assert.match(open,/tbNotifyDwfxSceneChange\("project-open"\)/);
  const copy=between("function poCreateEditableCopy(","function poOpenDialog(");
  assert.match(copy,/state\.projects\.push\(cp\);tbNotifyDwfxSceneChange\("project-copy"\)/);
});
