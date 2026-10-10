import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 390: review audit public diagnostics fields are driven by domain model",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/review_reason_count_consistent:reviewReasonCountConsistent/);
  assert.match(fn,/review_reason_lists_consistent:reviewReasonListsConsistent/);
  assert.match(fn,/review_progress_issue_count:reviewProgressDiagnosticsModel\.issue_count/);
  assert.match(fn,/review_progress_errors:reviewProgressDiagnosticsModel\.errors/);
  assert.match(fn,/review_progress_issue_count_consistent:reviewProgressDiagnosticsModel\.issue_count_consistent/);
  assert.match(fn,/review_progress_error_codes_valid:reviewProgressDiagnosticsModel\.error_codes_valid/);
  assert.match(fn,/review_progress_status:reviewProgressDiagnosticsModel\.status/);
  assert.match(fn,/review_progress_diagnostics_valid:reviewProgressDiagnosticsModel\.valid/);
  assert.match(fn,/review_progress_error:reviewProgressDiagnosticsModel\.primary_error/);
});
