import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 193: project Dimension audit summary aggregates reference provenance counts",()=>{
  assert.match(ui,/reference_geometry_counts:\{Exact:0,Fitted:0,SectionDerived:0,Unknown:0\}/);
  assert.match(ui,/const referenceCounts=dimensionReferenceStatusCounts\(dimension\)/);
  assert.match(ui,/summary\.reference_geometry_counts\[key\]\+=Number\(referenceCounts\[key\]\?\?0\)/);
});
