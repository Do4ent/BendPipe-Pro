import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 470: Saved Dimensions filters Dimensions requiring review action",()=>{
  assert.match(ui,/review-action/);
  assert.match(ui,/dimensionManagerFilter==="review-action"/);
  assert.match(ui,/dimensionReviewContext\(dimension,reviewContextState\)\.action_required===true/);
  assert.match(ui,/'review-action':'Review action \('\+managerReviewContextSummary\.action_required\+'\)'/);
});
