import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 388: manager cross-checks legacy diagnostics against domain model",()=>{
  assert.match(ui,/const legacyManagerReviewDiagnosticsModel=dimensionReviewProgressDiagnostics\(\{/);
  assert.match(ui,/const managerReviewDiagnosticsModel=standaloneManagerReviewDiagnosticsRuntime\.diagnostics/);
  assert.match(ui,/const managerReviewDiagnosticsModelConsistent=/);
  assert.match(ui,/managerReviewDiagnosticsModel\.issue_count_consistent/);
  assert.match(ui,/managerReviewDiagnosticsModel\.error_codes_valid/);
  assert.match(ui,/const reviewReasonDiagnosticsValid=managerReviewDiagnosticsModel\.valid/);
  assert.match(ui,/data-review-diagnostics-model-consistent="'\+\(managerReviewDiagnosticsModelConsistent\?'1':'0'\)\+'"/);
  assert.match(ui,/diag-model '\+\(managerReviewDiagnosticsModelConsistent\?'aligned':'diverged'\)/);
});
