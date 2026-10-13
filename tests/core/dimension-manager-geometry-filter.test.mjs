import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 164: Saved Dimensions filters by trusted geometry status",()=>{
  assert.match(ui,/dimensionManagerFilter==="exact"/);
  assert.match(ui,/dimensionAuditGeometryClass\(dimension\)==="Exact"/);
  assert.match(ui,/dimensionManagerFilter==="fitted"/);
  assert.match(ui,/dimensionAuditGeometryClass\(dimension\)==="Fitted"/);
  assert.match(ui,/dimensionManagerFilter==="unknown-geometry"/);
  assert.match(ui,/dimensionAuditGeometryClass\(dimension\)==="Unknown"/);
});

test("question 164: trusted geometry filters are exposed in audit controls",()=>{
  assert.match(ui,/exact:'Exact'/);
  assert.match(ui,/fitted:'Fitted'/);
  assert.match(ui,/'unknown-geometry':'Unknown geometry'/);
});
