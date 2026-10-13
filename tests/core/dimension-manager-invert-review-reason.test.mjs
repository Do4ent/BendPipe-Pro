import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 268: active review reason selection can be inverted",()=>{
  assert.match(ui,/function invertReviewReasonDimensionSelection\(\)/);
  assert.match(ui,/const ids=new Set\(snapshot\?\.queue\?\.dimension_ids\?\?\[\]\)/);
  assert.match(ui,/const selectedIds=new Set\(\)/);
  assert.match(ui,/replaceSelectionKeys\?\.\(\[\.\.\.kept,\.\.\.add\],\{announce:true\}\)/);
});

test("question 268: active reason UI exposes inversion action",()=>{
  assert.match(ui,/data-invert-dimension-review-reason/);
  assert.match(ui,/Invert reason queue/);
  assert.match(ui,/invertReviewReasonDimensionSelection\(\);render\(\)/);
});
