import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 387: review queue audit persists domain-generated diagnostics model",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const reviewReasonCountConsistent=/);
  assert.match(fn,/const reviewReasonListsConsistent=/);
  assert.match(fn,/const reviewProgressDiagnosticsModel=dimensionReviewProgressDiagnostics\(\{/);
  assert.match(fn,/domain_status:reviewProgressRuntime\.domain_status/);
  assert.match(fn,/domain_consistent:domainReviewProgressConsistent/);
  assert.match(fn,/review_progress_diagnostics_model:reviewProgressDiagnosticsModel/);
});
