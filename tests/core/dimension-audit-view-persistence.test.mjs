import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 244: Dimension audit view persists per project outside project model",()=>{
  assert.match(ui,/function dimensionAuditViewStorageKey\(projectId=dimensionAuditViewProjectId\(\)\)/);
  assert.match(ui,/TubeBender\.DimensionAuditViewState\.v1\./);
  assert.match(ui,/sessionStorage\.setItem/);
  assert.match(ui,/sessionStorage\.getItem/);
  assert.match(ui,/filter:dimensionManagerFilter/);
  assert.match(ui,/sort:dimensionManagerSort/);
  assert.match(ui,/search:dimensionManagerSearch/);
});

test("question 244: temporary exact focus is not persisted as the normal audit view",()=>{
  assert.match(ui,/if\(!dimensionManagerFocusId\)persistDimensionAuditViewState\(\)/);
  assert.match(ui,/restoreDimensionAuditViewState\(\);\n    const id=String\(dimensionId/);
});
