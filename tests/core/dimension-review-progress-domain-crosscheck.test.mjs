import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 343: UI review progress cross-checks pure domain model",()=>{
  assert.match(ui,/function dimensionReviewProgressParity\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const reviewProgressParity=dimensionReviewProgressParity\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/review_progress_domain_available:domainReviewProgressAvailable/);
  assert.match(ui,/review_progress_domain_consistent:domainReviewProgressConsistent/);
});
