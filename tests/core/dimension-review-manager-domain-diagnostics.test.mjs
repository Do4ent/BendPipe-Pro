import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 391: Saved Dimensions diagnostics are driven by domain model",()=>{
  assert.match(ui,/const managerReviewDiagnosticsModel=dimensionReviewProgressDiagnostics\(\{/);
  assert.match(ui,/const reviewReasonProgressErrors=managerReviewDiagnosticsModel\.errors/);
  assert.match(ui,/const reviewReasonProgressIssueCount=managerReviewDiagnosticsModel\.issue_count/);
  assert.match(ui,/const reviewReasonProgressError=managerReviewDiagnosticsModel\.primary_error/);
  assert.match(ui,/const reviewReasonDiagnosticsValid=managerReviewDiagnosticsModel\.valid/);
  assert.match(ui,/const reviewReasonProgressStatus=managerReviewDiagnosticsModel\.status/);
  assert.match(ui,/managerReviewDiagnosticsModel\.issue_count_consistent/);
  assert.match(ui,/managerReviewDiagnosticsModel\.error_codes_valid/);
});
