import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 254: Review queue selection can be inverted without touching other selection kinds",()=>{
  assert.match(ui,/function invertReviewQueueDimensionSelection\(\)/);
  assert.match(ui,/if\(entry\?\.kind!=="dimension"\)return true/);
  assert.match(ui,/data-invert-dimension-review-queue/);
  assert.match(ui,/Invert review queue/);
});
