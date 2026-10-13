import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 253: Review queue can be removed without clearing other selection kinds",()=>{
  assert.match(ui,/function removeReviewQueueDimensionResultsFromSelection\(\)/);
  assert.match(ui,/if\(entry\?\.kind!=="dimension"\)return true/);
  assert.match(ui,/data-remove-dimension-review-queue/);
  assert.match(ui,/Remove review queue/);
});
