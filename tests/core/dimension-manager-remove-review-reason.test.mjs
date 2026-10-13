import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 267: active review reason can be removed from current selection",()=>{
  assert.match(ui,/function removeReviewReasonDimensionResultsFromSelection\(\)/);
  assert.match(ui,/const ids=new Set\(snapshot\?\.queue\?\.dimension_ids\?\?\[\]\)/);
  assert.match(ui,/entry\?\.kind!=="dimension"/);
  assert.match(ui,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
});

test("question 267: active reason UI exposes removal action",()=>{
  assert.match(ui,/data-remove-dimension-review-reason/);
  assert.match(ui,/Remove reason queue/);
  assert.match(ui,/removeReviewReasonDimensionResultsFromSelection\(\);render\(\)/);
});
