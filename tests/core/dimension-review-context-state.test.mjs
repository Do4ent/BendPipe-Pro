import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 453: Dimension review context supports reusable shared state",()=>{
  assert.match(ui,/function dimensionReviewContextState\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/progress:canonicalDimensionReviewProgress\(items,selectedIds\)/);
  assert.match(ui,/diagnostics_runtime:dimensionReviewProgressDiagnosticsRuntimeState\(items,selectedIds\)/);
  assert.match(ui,/diagnostics_integrity:dimensionReviewProgressDiagnosticsIntegrityState\(items,selectedIds\)/);
  assert.match(ui,/function dimensionReviewContext\(dimension,contextState=dimensionReviewContextState\(\)\)/);
  assert.match(ui,/contextState\?\.progress\?\?canonicalDimensionReviewProgress\(\)/);
  assert.match(ui,/contextState\?\.diagnostics_runtime\?\?dimensionReviewProgressDiagnosticsRuntimeState\(\)/);
});
