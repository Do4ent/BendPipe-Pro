import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 250: Review queue shows how many review items are selected",()=>{
  assert.match(ui,/const selectedReviewQueueCount=items\.filter\(dimension=>selectedIdSet\.has\(String\(dimension\?\.id\?\?""\)\)&&dimensionAuditNeedsReview\(dimension\)\)\.length/);
  assert.match(ui,/selectedReviewQueueCount\?' · selected '\+selectedReviewQueueCount:''/);
});
