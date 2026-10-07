import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 191: Dimension audit counts reference provenance classes",()=>{
  assert.match(measurements,/function dimensionReferenceStatusCounts\(dimension\)/);
  assert.match(measurements,/\{Exact:0,Fitted:0,SectionDerived:0,Unknown:0\}/);
  assert.match(measurements,/dimensionAuditGeometryClass,dimensionReferenceStatusCounts,dimensionFittedAuditStats/);
});

test("question 191: Dimension Properties shows reference provenance counts",()=>{
  assert.match(properties,/dimensionReferenceStatusCounts\?\.\(dimension\)/);
  assert.match(properties,/\["Reference provenance counts",referenceStatusCounts\]/);
});
