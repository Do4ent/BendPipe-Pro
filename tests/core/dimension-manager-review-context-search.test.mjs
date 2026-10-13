import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 467: Saved Dimensions search includes review context state health and blockers",()=>{
  assert.match(ui,/function dimensionSearchText\(dimension,reviewContextState=null\)/);
  assert.match(ui,/reviewContext\?\.state,reviewContext\?\.health,\.\.\.\(reviewContext\?\.blockers\?\?\[\]\)/);
  assert.match(ui,/if\(search\)\{[\s\S]*?const reviewContextState=dimensionReviewContextState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/dimensionSearchText\(dimension,reviewContextState\)\.includes\(search\)/);
});
