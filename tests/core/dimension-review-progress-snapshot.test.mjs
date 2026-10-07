import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 334: review queue audit persists normalized shared progress model",()=>{
  assert.match(ui,/function dimensionReviewProgressSnapshot\(progress\)/);
  assert.match(ui,/schema:"TubeBender\.DimensionReviewProgressSnapshot\.v1"/);
  assert.match(ui,/review_progress_model:dimensionReviewProgressSnapshot\(sharedReviewProgress\)/);
  assert.match(ui,/signature:dimensionReviewProgressSignature\(value\)/);
});
