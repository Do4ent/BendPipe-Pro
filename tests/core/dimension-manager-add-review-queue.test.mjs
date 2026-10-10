import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 252: Review queue can be added without replacing current selection",()=>{
  assert.match(ui,/function addReviewQueueDimensionResultsToSelection\(\)/);
  assert.match(ui,/new Set\(\[\.\.\.\(context\(\)\?\.selectionKeys\?\.\(\)\?\?\[\]\),\.\.\.keys\]\)/);
  assert.match(ui,/data-add-dimension-review-queue/);
  assert.match(ui,/Add review queue/);
});
