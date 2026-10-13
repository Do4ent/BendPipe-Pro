import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 471: Saved Dimensions can filter items not requiring review",()=>{
  assert.match(ui,/review-not-required/);
  assert.match(ui,/\["review-ready","review-pending","review-diagnostics-error","review-not-required"\]\.includes/);
  assert.match(ui,/"review-not-required":"not-required"/);
  assert.match(ui,/'review-not-required':'No review \('\+\(managerReviewContextSummary\.by_health\?\.\["not-required"\]\?\?0\)\+'\)'/);
});
