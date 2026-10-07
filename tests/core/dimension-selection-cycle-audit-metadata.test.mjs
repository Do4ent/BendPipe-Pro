import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const grips=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const context=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 198: Dimension 3D candidate exposes stable audit metadata",()=>{
  assert.match(grips,/status:String\(dimension\?\.status\?\?"Unknown"\)/);
  assert.match(grips,/mode:String\(dimension\?\.mode\?\?"Unknown"\)/);
  assert.match(grips,/geometryClass:String\(audit\?\.dimensionAuditGeometryClass/);
  assert.match(grips,/needsReview:audit\?\.dimensionAuditNeedsReview/);
});

test("question 198: shared selection cycle carries and renders Dimension audit metadata",()=>{
  assert.match(context,/dimensionStatus:dimensionCandidate\.status/);
  assert.match(context,/dimensionMode:dimensionCandidate\.mode/);
  assert.match(context,/dimensionGeometryClass:dimensionCandidate\.geometryClass/);
  assert.match(context,/dimensionNeedsReview:dimensionCandidate\.needsReview===true/);
  assert.match(context,/partLabel\+" · "\+mode\+" · "\+status\+" · "\+geometryClass/);
});
