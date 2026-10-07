import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 278: review reason audit persists exact selection coverage state",()=>{
  const fn=ui.match(/function reviewReasonDimensionAuditSnapshot\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const dimensionIds=items\.map/);
  assert.match(fn,/const selectedIds=dimensionIds\.filter/);
  assert.match(fn,/const unselectedIds=dimensionIds\.filter/);
  assert.match(fn,/selected_percent:selectedPercent/);
  assert.match(fn,/selection_coverage:selectionCoverage/);
  assert.match(fn,/unselected_dimension_ids:unselectedIds/);
});
