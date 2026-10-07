import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 396: review diagnostics model and signature are exposed for QA",()=>{
  assert.match(ui,/dimensionReviewProgressDiagnostics,dimensionReviewProgressDiagnosticsSignature,dimensionReviewProgressSignature/);
  assert.match(ui,/currentReviewProgressDiagnostics:\(\)=>reviewQueueDimensionAuditSnapshot\(\)\.queue\.review_progress_diagnostics_model/);
  assert.match(ui,/currentReviewProgressDiagnosticsSignature:\(\)=>reviewQueueDimensionAuditSnapshot\(\)\.queue\.review_progress_diagnostics_signature/);
});
