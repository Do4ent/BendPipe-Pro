import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 541: current audit download history summary getters are exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySummary:\(\)=>dimensionAuditDownloadAttemptHistorySummary\(\)/);
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySummarySignature:\(\)=>dimensionAuditDownloadAttemptHistorySummarySignature\(\)/);
});
