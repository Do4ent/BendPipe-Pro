import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 180: Dimension Properties can copy audit JSON",()=>{
  assert.match(properties,/data-dimension-copy-audit=/);
  assert.match(properties,/Copy audit JSON/);
  assert.match(properties,/TubeBenderMeasurements\?\.copyDimensionRebindAudit\?\.\(button\.dataset\.dimensionCopyAudit\)/);
});
