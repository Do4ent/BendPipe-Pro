import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 167: each Saved Dimension surfaces its trusted geometry class",()=>{
  assert.match(ui,/const geometryClass=dimensionAuditGeometryClass\(dimension\)/);
  assert.match(ui,/"Geometry: "\+geometryClass/);
});
