import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 260: Saved Dimensions shows review queue reason counts",()=>{
  assert.match(ui,/const reviewReasonCounts=\{\}/);
  assert.match(ui,/dimensionAuditNeedsReview\(dimension\)/);
  assert.match(ui,/dimensionAuditReviewReasons\(dimension\)/);
  assert.match(ui,/const reviewReasonEntries=Object\.entries\(reviewReasonCounts\)\.sort/);\n  assert.match(ui,/const reviewReasonSummary=reviewReasonEntries\.map/);
  assert.match(ui,/data-dimension-review-reason-summary/);
  assert.match(ui,/Review queue reasons: /);
});
