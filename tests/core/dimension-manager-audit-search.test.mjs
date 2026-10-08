import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 151: Saved Dimensions search indexes audit-relevant fields",()=>{
  assert.match(ui,/function dimensionSearchText\(dimension,reviewContextState=null\)/);
  assert.match(ui,/dimension\?\.id,dimension\?\.note,dimension\?\.kind,dimension\?\.mode,dimension\?\.status,dimension\?\.stale_reason/);
  assert.match(ui,/const sources=refs\.map\(ref=>String\(ref\?\.object_id\?\?""\)\)\.filter\(Boolean\)/);
  assert.match(ui,/reviewContext\?\.state,reviewContext\?\.health,\.\.\.\(reviewContext\?\.blockers\?\?\[\]\)/);
});

test("question 151: Saved Dimensions filters by search text",()=>{
  assert.match(ui,/dimensionManagerSearch=""/);
  assert.match(ui,/dimensionSearchText\(dimension,reviewContextState\)\.includes\(search\)/);
  assert.match(ui,/data-dimension-search/);
  assert.match(ui,/data-dimension-search-apply/);
  assert.match(ui,/data-dimension-search-clear/);
});

test("question 165: Saved Dimensions search indexes trusted geometry provenance",()=>{
  assert.match(ui,/const geometryStatuses=refs\.map\(ref=>String\(ref\?\.geometry_status\?\?""\)\)/);
  assert.match(ui,/dimensionAuditGeometryClass\(dimension\),\.\.\.dimensionAuditReviewReasons\(dimension\),\.\.\.geometryStatuses,\.\.\.sources/);
});
