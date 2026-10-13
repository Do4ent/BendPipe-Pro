import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 292: review queue audit exposes all-complete flag",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/review_reason_all_complete:reviewReasonCount>0&&reviewReasonPendingCount===0/);
  assert.match(fn,/review_reason_complete_count:reviewReasonCoverageSummary\.complete/);
  assert.match(fn,/review_reason_pending_count:reviewReasonPendingCount/);
});
