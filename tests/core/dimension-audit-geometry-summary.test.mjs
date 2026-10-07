import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 163: Dimension audit classifies trusted geometry provenance conservatively",()=>{
  assert.match(ui,/function dimensionAuditGeometryClass\(dimension\)/);
  assert.match(ui,/statuses\.includes\("Fitted"\).*return "Fitted"/s);
  assert.match(ui,/statuses\.includes\("SectionDerived"\).*return "SectionDerived"/s);
  assert.match(ui,/statuses\.length&&statuses\.every\(status=>status==="Exact"\).*return "Exact"/s);
  assert.match(ui,/return "Unknown"/);
});

test("question 163: audit summary exposes geometry status counts",()=>{
  assert.match(ui,/by_geometry_status:\{\}/);
  assert.match(ui,/summary\.by_geometry_status\[geometryStatus\]/);
  assert.match(ui,/Geometry '\+status\+'\: '\+count/);
});
