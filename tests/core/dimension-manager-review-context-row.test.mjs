import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 468: Saved Dimensions rows expose and show review context health",()=>{
  assert.match(ui,/const managerReviewContextState=dimensionReviewContextState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const reviewContext=dimensionReviewContext\(dimension,managerReviewContextState\)/);
  assert.match(ui,/data-review-context-health="'\+esc\(reviewContext\.health\)\+'"/);
  assert.match(ui,/data-review-context-state="'\+esc\(reviewContext\.state\)\+'"/);
  assert.match(ui,/data-review-action-required="'\+\(reviewContext\.action_required\?'1':'0'\)\+'"/);
  assert.match(ui,/reviewContext\.health!=="not-required"\?' · Review '\+esc\(reviewContext\.health\):''/);
});
