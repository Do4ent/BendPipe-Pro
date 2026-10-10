import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 285: review queue audit exposes unique review reason count",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const reviewReasonCount=Object\.keys\(reviewReasonCounts\)\.length/);
  assert.match(fn,/review_reason_count:reviewReasonCount/);
  assert.match(fn,/review_reason_counts:reviewReasonCounts/);
  assert.match(fn,/review_reason_coverage_summary:reviewReasonCoverageSummary/);
});
