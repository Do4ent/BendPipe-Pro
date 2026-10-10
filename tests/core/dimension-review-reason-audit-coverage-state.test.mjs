import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 278: review reason audit persists exact selection coverage state",()=>{
  assert.match(ui,/function reviewReasonDimensionAuditSnapshot\(reason=activeDimensionReviewReason\(\)\)/);
  assert.match(ui,/const dimensionIds=items\.map/);
  assert.match(ui,/const selectedIds=dimensionIds\.filter/);
  assert.match(ui,/const unselectedIds=dimensionIds\.filter/);
  assert.match(ui,/selected_percent:selectedPercent/);
  assert.match(ui,/selection_coverage:selectionCoverage/);
  assert.match(ui,/unselected_dimension_ids:unselectedIds/);
});
