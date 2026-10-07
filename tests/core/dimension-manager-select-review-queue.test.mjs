import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 251: Saved Dimensions can select the full review queue",()=>{
  assert.match(ui,/function selectReviewQueueDimensionResults\(\)/);
  assert.match(ui,/savedDimensions\(\)\.filter\(dimension=>dimensionAuditNeedsReview\(dimension\)\)/);
  assert.match(ui,/data-select-dimension-review-queue/);
  assert.match(ui,/Select review queue/);
});
