import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 326: shared model divergence participates in all audit diagnostics",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/\+\(!sharedReviewProgressConsistent\?1:0\)/);
  assert.match(fn,/!sharedReviewProgressConsistent\?"REVIEW_PROGRESS_MODEL_DIVERGENCE":null/);
  assert.match(fn,/&&sharedReviewProgressConsistent/);
  assert.match(fn,/&&domainReviewProgressConsistent/);
  assert.match(fn,/\?"ok":"error"/);
  assert.match(fn,/REVIEW_PROGRESS_MODEL_DIVERGENCE":null/);
});
