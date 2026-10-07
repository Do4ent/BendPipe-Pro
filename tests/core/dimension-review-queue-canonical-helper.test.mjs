import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 352: review queue audit uses centralized canonical helper",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const canonicalReviewProgress=canonicalDimensionReviewProgress\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(fn,/review_progress_source:canonicalReviewProgress\.source/);
  assert.match(fn,/review_progress_model:canonicalReviewProgress\.snapshot/);
  assert.match(fn,/review_progress_signature:canonicalReviewProgress\.signature/);
});
