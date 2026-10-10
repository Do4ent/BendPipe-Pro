import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 265: active review reason queue can replace Dimension selection",()=>{
  assert.match(ui,/function selectReviewReasonDimensionResults\(\)/);
  assert.match(ui,/reviewReasonDimensionAuditSnapshot\(\)/);
  assert.match(ui,/snapshot\?\.queue\?\.dimension_ids\?\?\[\]/);
  assert.match(ui,/replaceSelectionKeys\?\.\(keys,\{announce:true\}\)/);
});

test("question 265: active review reason exposes Select reason queue action",()=>{
  assert.match(ui,/data-select-dimension-review-reason/);
  assert.match(ui,/Select reason queue/);
  assert.match(ui,/selectReviewReasonDimensionResults\(\);render\(\)/);
});
