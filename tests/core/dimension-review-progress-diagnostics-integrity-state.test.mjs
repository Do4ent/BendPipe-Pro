import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 428: parity-aware diagnostics integrity state drives current QA API",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsIntegrityState\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\),stateConsistent=true\)/);
  assert.match(ui,/const parity=dimensionReviewProgressDiagnosticsIntegrityParity\(runtime,stateConsistent\)/);
  assert.match(ui,/parity\.available\?parity\.consistent:null/);
  assert.match(ui,/currentReviewProgressDiagnosticsIntegrity:\(\)=>dimensionReviewProgressDiagnosticsIntegrityState\(\)\.integrity/);
  assert.match(ui,/currentReviewProgressDiagnosticsIntegritySignature:\(\)=>dimensionReviewProgressDiagnosticsIntegrityState\(\)\.signature/);
  assert.match(ui,/currentReviewProgressDiagnosticsIntegrityParity:\(\)=>dimensionReviewProgressDiagnosticsIntegrityState\(\)\.parity/);
});
