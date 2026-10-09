import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1010-1011: real export events carry signed final-state evidence",()=>{
  assert.match(ui,/final_state_signature:String\(evidence\.final_state_signature\?\?""\)/);
  assert.match(ui,/final_state_snapshot_signature:String\(evidence\.final_state_snapshot_signature\?\?""\)/);
  assert.match(ui,/final_state_signature:dimensionAuditDownloadHistoryExportFinalStateSignature\(exportFinalState\)/);
  assert.match(ui,/final_state_snapshot_signature:exportFinalStateSnapshot\.snapshot_signature/);
});
