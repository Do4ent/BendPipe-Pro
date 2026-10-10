import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 466: Saved Dimensions supports Review context sorting",()=>{
  assert.match(ui,/\["project","audit","review-context"\]\.includes/);
  assert.match(ui,/if\(dimensionManagerSort==="review-context"\)/);
  assert.match(ui,/const healthRank=\{ "diagnostics-error":0,pending:1,ready:2,"not-required":3 \}/);
  assert.match(ui,/dimensionReviewContext\(dimension,reviewContextState\)\.health/);
  assert.match(ui,/data-dimension-sort="review-context"/);
  assert.match(ui,/>Review context<\/button>/);
});
