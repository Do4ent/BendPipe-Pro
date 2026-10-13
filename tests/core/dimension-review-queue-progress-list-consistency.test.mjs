import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 303: review queue audit validates review reason progress lists",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const reviewReasonListsConsistent=completedReviewReasons\.length===reviewReasonCoverageSummary\.complete&&pendingReviewReasons\.length===reviewReasonPendingCount/);
  assert.match(fn,/review_reason_lists_consistent:reviewReasonListsConsistent/);
});
