import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 178: Dimension Properties exposes trusted geometry audit",()=>{
  assert.match(properties,/const audit=window\.TubeBenderMeasurements\?\?null/);
  assert.match(properties,/dimensionAuditGeometryClass\?\.\(dimension\)/);
  assert.match(properties,/dimensionAuditReviewReasons\?\.\(dimension\)/);
  assert.match(properties,/dimensionFittedAuditStats\?\.\(dimension\)/);
  assert.match(properties,/name:"Trusted geometry audit"/);
  assert.match(properties,/\["Geometry class",geometryClass\]/);
  assert.match(properties,/\["Needs review",reviewReasons\.length>0\]/);
  assert.match(properties,/\["Review reasons",reviewReasons\]/);
  assert.match(properties,/\["Fitted stats",fittedStats\]/);
});
