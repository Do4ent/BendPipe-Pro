import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const grips=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 196: Dimension grips exposes a shared 3D selection candidate",()=>{
  assert.match(grips,/function selectionCandidateAtEvent\(event\)/);
  assert.match(grips,/dimensionId:id/);
  assert.match(grips,/selectionCandidateAtEvent,activeDimension/);
});

test("question 196: shared selection cycle includes Dimension candidates",()=>{
  assert.match(selection,/dimensionGripsApi\(\)\?\.selectionCandidateAtEvent\?\.\(event\)/);
  assert.match(selection,/entry:\{kind:"dimension",dimensionId:String\(dimensionCandidate\.dimensionId\)\}/);
});

test("question 196: Dimension chooser label exposes audit state",()=>{
  assert.match(selection,/dimensionAuditGeometryClass\?\.\(dimension\)/);
  assert.match(selection,/dimensionAuditNeedsReview\?\.\(dimension\)===true/);
  assert.match(selection,/⚠ Needs review/);
});
