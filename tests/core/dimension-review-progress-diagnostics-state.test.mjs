import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 397: current review diagnostics state is computed without full audit snapshot",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsState\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const fallback=dimensionReviewProgressFallback\(reviewItems,selectedIds\)/);
  assert.match(ui,/const canonical=canonicalDimensionReviewProgress\(items,selectedIds\)/);
  assert.match(ui,/const runtime=dimensionReviewProgressRuntimeState\(items,selectedIds\)/);
  assert.match(ui,/currentReviewProgressDiagnostics:\(\)=>dimensionReviewProgressDiagnosticsState\(\)\.diagnostics/);
  assert.match(ui,/currentReviewProgressDiagnosticsSignature:\(\)=>dimensionReviewProgressDiagnosticsState\(\)\.signature/);
  assert.match(ui,/currentReviewProgressDiagnosticsState:\(\)=>dimensionReviewProgressDiagnosticsState\(\)/);
});
