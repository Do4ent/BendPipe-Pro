import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 266: active review reason queue can be added to current selection",()=>{
  assert.match(ui,/function addReviewReasonDimensionResultsToSelection\(\)/);
  assert.match(ui,/reviewReasonDimensionAuditSnapshot\(\)/);
  assert.match(ui,/const merged=\[\.\.\.new Set\(\[\.\.\.\(context\(\)\?\.selectionKeys\?\.\(\)\?\?\[\]\),\.\.\.keys\]\)\]/);
  assert.match(ui,/replaceSelectionKeys\?\.\(merged,\{announce:true\}\)/);
});

test("question 266: active reason UI exposes additive selection action",()=>{
  assert.match(ui,/data-add-dimension-review-reason/);
  assert.match(ui,/Add reason queue/);
  assert.match(ui,/addReviewReasonDimensionResultsToSelection\(\);render\(\)/);
});
