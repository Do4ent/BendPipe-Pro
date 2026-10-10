import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 256: Review queue audit can be copied independently of current selection",()=>{
  assert.match(ui,/function reviewQueueDimensionAuditSnapshot\(\)/);
  assert.match(ui,/TubeBender\.DimensionReviewQueueAudit\.v1/);
  assert.match(ui,/filter\(dimension=>dimensionAuditNeedsReview\(dimension\)\)/);
  assert.match(ui,/function copyReviewQueueDimensionAudits\(\)/);
  assert.match(ui,/data-copy-dimension-review-queue-audit/);
  assert.match(ui,/Copy review queue audit JSON/);
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const dimensionIds=items\.map/);
  assert.match(fn,/dimension_ids:dimensionIds/);
  assert.match(fn,/selected_dimension_ids:selectedIds/);
});
