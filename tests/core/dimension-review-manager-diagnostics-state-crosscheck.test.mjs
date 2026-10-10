import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 399: manager cross-checks standalone diagnostics state",()=>{
  assert.match(ui,/const standaloneManagerReviewDiagnosticsRuntime=dimensionReviewProgressDiagnosticsRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/dimensionReviewProgressDiagnosticsSignature\(legacyManagerReviewDiagnosticsModel\)===managerReviewDiagnosticsSignature/);
  assert.match(ui,/data-review-diagnostics-state-consistent="'\+\(standaloneManagerReviewDiagnosticsConsistent\?'1':'0'\)\+'"/);
  assert.match(ui,/diag-state '\+\(standaloneManagerReviewDiagnosticsConsistent\?'aligned':'diverged'\)/);
});
