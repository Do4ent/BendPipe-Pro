import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

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
  assert.match(build,/if\(tbHistorySnapshotKey\(token\.before\)===tbHistorySnapshotKey\(after\)\)/);
});

test("question 62: History API exposes timeline cursor jump and panel access",()=>{
  assert.match(build,/timeline:\(\)=>tbHistoryTimeline/);
  assert.match(build,/cursor:tbHistoryCursor/);
  assert.match(build,/jump:tbHistoryJump/);
  assert.match(build,/openPanel:/);
});
