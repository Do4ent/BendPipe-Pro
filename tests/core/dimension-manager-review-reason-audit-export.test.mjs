import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 264: active review reason has a dedicated audit snapshot",()=>{
  assert.match(ui,/function reviewReasonDimensionAuditSnapshot\(reason=activeDimensionReviewReason\(\)\)/);
  assert.match(ui,/TubeBender\.DimensionReviewReasonAudit\.v1/);
  assert.match(ui,/review_reason:target/);
  assert.match(ui,/dimensionAuditReviewReasons\(dimension\)\.includes\(target\)/);
});

test("question 264: active reason audit can be copied and downloaded",()=>{
  assert.match(ui,/function copyReviewReasonDimensionAudits\(\)/);
  assert.match(ui,/function downloadReviewReasonDimensionAudits\(\)/);
  assert.match(ui,/data-copy-dimension-review-reason-audit/);
  assert.match(ui,/data-download-dimension-review-reason-audit/);
  assert.match(ui,/dimension-review-reason-/);
});
