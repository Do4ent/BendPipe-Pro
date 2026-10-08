import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
test("question 464: Saved Dimensions filters by review context health",()=>{
  assert.match(ui,/"review-ready","review-pending","review-diagnostics-error","review-not-required"/);
  assert.match(ui,/const reviewContextState=dimensionReviewContextState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/"review-ready":"ready"/);
  assert.match(ui,/"review-pending":"pending"/);
  assert.match(ui,/"review-diagnostics-error":"diagnostics-error"/);
  assert.match(ui,/"review-not-required":"not-required"/);
  assert.match(ui,/dimensionReviewContext\(dimension,reviewContextState\)\.health===targetHealth/);
});
