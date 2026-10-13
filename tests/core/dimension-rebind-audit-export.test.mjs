import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
test("question 143: Rebind audit exports a structured diagnostic snapshot",()=>{
  assert.match(ui,/function dimensionRebindAuditSnapshot\(dimension,reviewContextState=null\)/);
  assert.match(ui,/dimension_id:String\(dimension\?\.id\?\?""\)/);
  assert.match(ui,/review_context:clone\(reviewContext\)/);
  assert.match(ui,/current_references:clone\(references\)/);
  assert.match(ui,/rebound_history:clone/);
});
test("question 143: Saved Dimensions can copy audit JSON without mutating model",()=>{
  assert.match(ui,/async function copyDimensionRebindAudit\(dimensionId\)/);
  assert.match(ui,/JSON\.stringify\(dimensionRebindAuditSnapshot\(dimension\),null,2\)/);
  assert.match(ui,/navigator\?\.clipboard\?\.writeText/);
  assert.match(ui,/data-copy-rebind-audit=/);
  assert.match(ui,/Copy audit JSON/);
});
test("question 166: Dimension audit snapshot carries trusted geometry provenance",()=>{
  assert.match(ui,/geometry_class:dimensionAuditGeometryClass\(dimension\)/);
  assert.match(ui,/reference_geometry_statuses:referenceGeometryStatuses/);
  assert.match(ui,/new Set\(references\.map\(ref=>String\(ref\?\.geometry_status\?\?""\)\.trim\(\)\)\.filter\(Boolean\)\)/);
});
test("question 169: Dimension audit snapshot carries conservative Fitted stats",()=>{ assert.match(ui,/fitted_stats:clone\(dimensionFittedAuditStats\(dimension\)\)/); });
test("question 173: Dimension audit snapshot persists Needs review policy result",()=>{ assert.match(ui,/needs_review:dimensionAuditNeedsReview\(dimension\)/); });
