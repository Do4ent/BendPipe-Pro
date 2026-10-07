import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 388: manager cross-checks legacy diagnostics against domain model",()=>{
  assert.match(ui,/const managerReviewDiagnosticsModel=dimensionReviewProgressDiagnostics\(\{/);
  assert.match(ui,/const managerReviewDiagnosticsModelConsistent=/);
  assert.match(ui,/managerReviewDiagnosticsModel\.issue_count===reviewReasonProgressIssueCount/);
  assert.match(ui,/managerReviewDiagnosticsModel\.valid===reviewReasonDiagnosticsValid/);
  assert.match(ui,/data-review-diagnostics-model-consistent="'\+\(managerReviewDiagnosticsModelConsistent\?'1':'0'\)\+'"/);
  assert.match(ui,/diag-model '\+\(managerReviewDiagnosticsModelConsistent\?'aligned':'diverged'\)/);
});
