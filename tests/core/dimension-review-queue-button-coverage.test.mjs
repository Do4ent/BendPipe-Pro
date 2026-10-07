import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 280: full review queue button shows selection coverage",()=>{
  assert.match(ui,/const unselectedReviewQueueCount=Math\.max\(0,auditSummary\.needs_review-selectedReviewQueueCount\)/);
  assert.match(ui,/const selectedReviewQueuePercent=auditSummary\.needs_review\?Math\.round\(selectedReviewQueueCount\/auditSummary\.needs_review\*100\):0/);
  assert.match(ui,/const selectedReviewQueueCoverage=selectedReviewQueueCount===0\?"none":selectedReviewQueueCount===auditSummary\.needs_review\?"complete":"partial"/);
  assert.match(ui,/data-selection-coverage="'\+selectedReviewQueueCoverage\+'"/);
  assert.match(ui,/unselected '\+unselectedReviewQueueCount/);
  assert.match(ui,/selectedReviewQueuePercent\+'% · '\+selectedReviewQueueCoverage/);
});
