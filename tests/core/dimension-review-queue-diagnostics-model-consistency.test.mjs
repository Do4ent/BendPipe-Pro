import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 389: review audit cross-checks diagnostics domain model against legacy state",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const legacyReviewProgressErrors=\[/);
  assert.match(fn,/const legacyReviewProgressDiagnosticsValid=/);
  assert.match(fn,/const legacyReviewProgressStatus=/);
  assert.match(fn,/const reviewProgressDiagnosticsModelConsistent=/);
  assert.match(fn,/review_progress_diagnostics_model_consistent:reviewProgressDiagnosticsModelConsistent/);
});
