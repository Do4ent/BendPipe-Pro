import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 296: review queue audit lists completed and pending reasons",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const completedReviewReasons=Object\.entries\(reviewReasonSelection\)/);
  assert.match(fn,/const pendingReviewReasons=Object\.entries\(reviewReasonSelection\)/);
  assert.match(fn,/completed_review_reasons:completedReviewReasons/);
  assert.match(fn,/pending_review_reasons:pendingReviewReasons/);
});
