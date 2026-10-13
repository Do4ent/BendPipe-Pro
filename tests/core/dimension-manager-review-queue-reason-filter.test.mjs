import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 261: Review queue reasons are searchable audit terms",()=>{
  assert.match(ui,/dimensionAuditGeometryClass\(dimension\),\.\.\.dimensionAuditReviewReasons\(dimension\),\.\.\.geometryStatuses/);
});

test("question 261: Review queue reason summary exposes reason filter actions",()=>{
  assert.match(ui,/data-dimension-review-reason=/);
  assert.match(ui,/data-dimension-review-reason-filters/);
  assert.match(ui,/dimensionManagerFilter="needs-review"/);
  assert.match(ui,/dimensionManagerSort="audit"/);
  assert.match(ui,/dimensionManagerSearch=String\(button\.dataset\.dimensionReviewReason\?\?""\)/);
});
