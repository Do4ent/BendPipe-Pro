import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 402: manager uses diagnostics runtime state as canonical model",()=>{
  assert.match(ui,/const standaloneManagerReviewDiagnosticsRuntime=dimensionReviewProgressDiagnosticsRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const managerReviewDiagnosticsModel=standaloneManagerReviewDiagnosticsRuntime\.diagnostics/);
  assert.match(ui,/const managerReviewDiagnosticsSignature=standaloneManagerReviewDiagnosticsRuntime\.signature/);
  assert.match(ui,/dimensionReviewProgressDiagnosticsSignature\(legacyManagerReviewDiagnosticsModel\)===managerReviewDiagnosticsSignature/);
});
