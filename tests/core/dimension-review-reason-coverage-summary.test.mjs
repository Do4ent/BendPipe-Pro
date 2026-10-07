import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 283: Saved Dimensions summarizes review reason coverage states",()=>{
  assert.match(ui,/const reviewReasonCoverageCounts=\{none:0,partial:0,complete:0\}/);
  assert.match(ui,/reviewReasonCoverageCounts\[selectionCoverage\]\+\+/);
  assert.match(ui,/Coverage complete: '\+reviewReasonCoverageCounts\.complete/);
  assert.match(ui,/partial: '\+reviewReasonCoverageCounts\.partial/);
  assert.match(ui,/none: '\+reviewReasonCoverageCounts\.none/);
});
