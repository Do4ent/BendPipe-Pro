import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 284: review queue audit summarizes per-reason coverage states",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const reviewReasonCoverageSummary=\{none:0,partial:0,complete:0\}/);
  assert.match(fn,/Object\.values\(reviewReasonSelection\)/);
  assert.match(fn,/review_reason_coverage_summary:reviewReasonCoverageSummary/);
});
