import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1539: public measurements API is frozen",()=>{
  assert.match(ui,/window\.TubeBenderMeasurements=Object\.freeze\(\{/);
});

test("question 1540: open action remains publicly exposed",()=>{
  assert.match(ui,/Object\.freeze\(\{\s*open,close,focusDimensionAudit/);
});

test("question 1541: close action remains publicly exposed",()=>{
  assert.match(ui,/open,close,focusDimensionAudit/);
});

test("question 1542: focus-dimension-audit action remains publicly exposed",()=>{
  assert.match(ui,/close,focusDimensionAudit,refresh:render/);
});

test("question 1543: refresh delegates directly to render",()=>{
  assert.match(ui,/refresh:render/);
});

test("question 1544: dimension-audit view project-id helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditViewProjectId,dimensionAuditViewStorageKey/);
});

test("question 1545: dimension-audit view storage-key helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditViewStorageKey,persistDimensionAuditViewState/);
});

test("question 1546: persist audit-view state action remains publicly exposed",()=>{
  assert.match(ui,/persistDimensionAuditViewState,clearPersistedDimensionAuditViewState/);
});

test("question 1547: clear persisted audit-view state action remains publicly exposed",()=>{
  assert.match(ui,/clearPersistedDimensionAuditViewState,restoreDimensionAuditViewState/);
});

test("question 1548: restore audit-view state action remains publicly exposed",()=>{
  assert.match(ui,/restoreDimensionAuditViewState,buildMeasurement/);
});

test("question 1549: build-measurement helper remains publicly exposed",()=>{
  assert.match(ui,/buildMeasurement,savedDimensions/);
});

test("question 1550: saved-dimensions helper remains publicly exposed",()=>{
  assert.match(ui,/savedDimensions,saveCurrentDimension/);
});

test("question 1551: save-current-dimension action remains publicly exposed",()=>{
  assert.match(ui,/saveCurrentDimension,saveCurrentDrivingDimension/);
});

test("question 1552: save-current-driving-dimension action remains publicly exposed",()=>{
  assert.match(ui,/saveCurrentDrivingDimension,invalidateSectionDerivedDimensions/);
});

test("question 1553: invalidate section-derived dimensions action remains publicly exposed",()=>{
  assert.match(ui,/invalidateSectionDerivedDimensions,rebindSectionDerivedDimension/);
});

test("question 1554: rebind section-derived dimension action remains publicly exposed",()=>{
  assert.match(ui,/rebindSectionDerivedDimension,sectionRebindCompatibility/);
});

test("question 1555: section rebind-compatibility helper remains publicly exposed",()=>{
  assert.match(ui,/sectionRebindCompatibility,dimensionAuditProjectContext/);
});

test("question 1556: dimension-audit project-context helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditProjectContext,dimensionRebindAuditSnapshot/);
});

test("question 1557: dimension rebind-audit snapshot helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionRebindAuditSnapshot,copyDimensionRebindAudit/);
});

test("question 1558: copy dimension rebind-audit action remains publicly exposed",()=>{
  assert.match(ui,/copyDimensionRebindAudit,downloadDimensionRebindAudit/);
});
