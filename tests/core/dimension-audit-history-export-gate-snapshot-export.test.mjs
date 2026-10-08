import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 747: copy and download require a valid history export gate snapshot",()=>{
  const matches=[...ui.matchAll(/const exportGateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot\(exportGate\)/g)];
  assert.equal(matches.length,2);
  assert.match(ui,/const exportGateSnapshotValid=dimensionAuditDownloadHistoryExportGateSnapshotValid\(exportGateSnapshot\)/);
  assert.match(ui,/const blockCode=!exportGateSnapshotValid\?"INVALID_GATE_SNAPSHOT":exportGate\.code/);
  assert.match(ui,/if\(!exportGateSnapshotValid\|\|!exportGate\.allowed\)/);
});
