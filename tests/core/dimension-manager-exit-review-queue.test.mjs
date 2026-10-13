import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 255: exiting review queue resets audit view without mutating selection",()=>{
  assert.match(ui,/function exitDimensionReviewQueue\(\)/);
  assert.match(ui,/dimensionManagerFilter="all"/);
  assert.match(ui,/dimensionManagerSort="project"/);
  assert.match(ui,/dimensionManagerSearch=""/);
  assert.match(ui,/dimensionManagerFocusId=""/);
  assert.match(ui,/data-dimension-review-queue-exit/);
  assert.match(ui,/addEventListener\("click",exitDimensionReviewQueue\)/);
  const fn=ui.match(/function exitDimensionReviewQueue\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.doesNotMatch(fn,/replaceSelectionKeys|clearDimensionSelection|selectionKeys/);
});
