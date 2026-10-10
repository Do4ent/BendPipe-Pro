import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");
const legacy=fs.readFileSync(path.join(root,"legacy","VC207R7","TubeBender_CAD_VC207R7_Pixel_Matched_Approved_Interface_Release.html"),"utf8");

test("question 62: standalone adds a separate History timeline panel",()=>{
  assert.match(build,/tbHistoryEnsurePanel/);
  assert.match(build,/tbHistoryPanelRender/);
  assert.match(build,/tbHistoryToggle/);
  assert.match(build,/tbHistoryPanel/);
  assert.match(build,/Начальное состояние/);
  assert.match(build,/data-history-target/);
});

test("question 62: History jump restores a selected snapshot without recording another command",()=>{
  assert.match(build,/function tbHistoryJump\(targetIndex\)/);
  assert.match(build,/const snapshot=target===0\?all\[0\]\.before:all\[target-1\]\.after/);
  assert.match(build,/if\(!tbHistoryRestore\(snapshot\)\)return false/);
  assert.match(build,/tbHistory\.undo\.splice/);
  assert.match(build,/tbHistory\.redo\.splice/);
  const jumpBlock=build.slice(build.indexOf('"function tbHistoryJump'),build.indexOf('"function tbHistoryEnsurePanel'));
  assert.doesNotMatch(jumpBlock,/tbHistoryCommit/);
  assert.doesNotMatch(jumpBlock,/tbModelCommand/);
});

test("question 62: existing atomic model command rejects failed and conflicting operations before commit",()=>{
  assert.match(build,/if\(result===false\)\{tbHistoryCancel\(token\);return false;\}/);
  assert.match(build,/if\(fixedEndResult\?\.ok===false\)/);
  assert.match(build,/if\(liveCollisionResult\?\.ok===false\)/);
  assert.match(build,/tbHistoryCancel\(token\)/);
  assert.match(legacy,/if\(tbHistorySnapshotKey\(token\.before\)===tbHistorySnapshotKey\(after\)\)/);
});

test("question 62: History API exposes timeline cursor jump and panel access",()=>{
  assert.match(build,/timeline:\(\)=>tbHistoryTimeline/);
  assert.match(build,/cursor:tbHistoryCursor/);
  assert.match(build,/jump:tbHistoryJump/);
  assert.match(build,/openPanel:/);
});


test("question 63: History persists undo redo state across sessions with model signature guard",()=>{
  assert.match(build,/TB_HISTORY_STORAGE_KEY='tubebender\.modelHistory\.v1'/);
  assert.match(build,/function tbHistoryPersist\(\)/);
  assert.match(build,/function tbHistoryRestorePersisted\(\)/);
  assert.match(build,/current_signature:tbHistorySignature\(current\)/);
  assert.match(build,/saved\.current_signature!==tbHistorySignature\(current\)/);
  assert.match(build,/localStorage\.setItem\(TB_HISTORY_STORAGE_KEY/);
  assert.match(build,/localStorage\.getItem\(TB_HISTORY_STORAGE_KEY/);
  assert.match(build,/tbHistory\.undo\.splice/);
  assert.match(build,/tbHistory\.redo\.splice/);
  assert.match(build,/tbHistoryRestorePersisted\(\);/);
});

test("question 63: persisted History validates snapshots and degrades safely on storage quota",()=>{
  assert.match(build,/saved\.undo\.every\(valid\)/);
  assert.match(build,/saved\.redo\.every\(valid\)/);
  assert.match(build,/keepUndo=Math\.max\(0,keepUndo-5\)/);
  assert.match(build,/keepRedo=Math\.max\(0,keepRedo-5\)/);
  assert.match(build,/truncated:keepUndo<undo\.length\|\|keepRedo<redo\.length/);
  assert.match(build,/localStorage\.removeItem\(TB_HISTORY_STORAGE_KEY\)/);
});

test("question 63: History API exposes explicit persist and restore hooks",()=>{
  assert.match(build,/persist:tbHistoryPersist/);
  assert.match(build,/restorePersisted:tbHistoryRestorePersisted/);
});
