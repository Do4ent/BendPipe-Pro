import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 414: review diagnostics integrity is normalized for audit and QA",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsIntegrity\(runtime,stateConsistent=true,parityConsistent=null\)/);
  assert.match(ui,/schema:"TubeBender\.DimensionReviewProgressDiagnosticsIntegrity\.v1"/);
  assert.match(ui,/review_progress_diagnostics_integrity:reviewProgressDiagnosticsIntegrity/);
  assert.match(ui,/currentReviewProgressDiagnosticsIntegrity:\(\)=>\{const runtime=dimensionReviewProgressDiagnosticsRuntimeState\(\);return dimensionReviewProgressDiagnosticsIntegrity\(runtime,true\);\}/);
});
