import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 181: Measurements can focus Saved Dimensions audit by Dimension id",()=>{
  assert.match(measurements,/function focusDimensionAudit\(dimensionId\)/);
  assert.match(measurements,/dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch=id/);
  assert.match(measurements,/open\(\);return true/);
  assert.match(measurements,/open,close,focusDimensionAudit,refresh:render/);
});

test("question 181: Dimension Properties opens the focused Saved Dimensions audit",()=>{
  assert.match(properties,/data-dimension-open-audit=/);
  assert.match(properties,/Open in Saved Dimensions/);
  assert.match(properties,/TubeBenderMeasurements\?\.focusDimensionAudit\?\.\(button\.dataset\.dimensionOpenAudit\)/);
});
