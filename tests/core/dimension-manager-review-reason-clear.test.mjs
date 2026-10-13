import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 263: review reason filters expose one-click return to full Review queue",()=>{
  assert.match(ui,/const fullReviewQueueActive=dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&!dimensionManagerSearch/);
  assert.match(ui,/data-dimension-review-reason-clear/);
  assert.match(ui,/All review reasons/);
});

test("question 263: clearing a review reason keeps the Review queue context",()=>{
  assert.match(ui,/dimensionManagerFilter="needs-review";/);
  assert.match(ui,/dimensionManagerSort="audit";/);
  assert.match(ui,/dimensionManagerSearch="";/);
});
