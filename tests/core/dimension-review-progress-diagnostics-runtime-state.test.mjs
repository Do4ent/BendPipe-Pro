import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 400: review diagnostics runtime source is explicit in QA audit and manager",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsRuntimeState\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/source:domainDiagnosticsAvailable\?"domain":"ui-fallback"/);
  assert.match(ui,/review_progress_diagnostics_source:standaloneReviewDiagnosticsRuntime\.source/);
  assert.match(ui,/review_progress_diagnostics_domain_status:standaloneReviewDiagnosticsRuntime\.domain_status/);
  assert.match(ui,/data-review-diagnostics-source="'\+esc\(standaloneManagerReviewDiagnosticsRuntime\.source\)\+'"/);
  assert.match(ui,/data-review-diagnostics-domain-status="'\+esc\(standaloneManagerReviewDiagnosticsRuntime\.domain_status\)\+'"/);
  assert.match(ui,/currentReviewProgressDiagnosticsRuntimeState:\(\)=>dimensionReviewProgressDiagnosticsRuntimeState\(\)/);
});
