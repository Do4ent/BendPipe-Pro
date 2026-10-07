import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 404: review diagnostics snapshot is available in audit and QA API",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsSnapshot\(diagnostics=\{\}\)/);
  assert.match(ui,/reviewProgressDomain\?\.reviewProgressDiagnosticsSnapshot/);
  assert.match(ui,/review_progress_diagnostics_snapshot:dimensionReviewProgressDiagnosticsSnapshot\(reviewProgressDiagnosticsModel\)/);
  assert.match(ui,/currentReviewProgressDiagnosticsSnapshot:\(\)=>dimensionReviewProgressDiagnosticsSnapshot\(dimensionReviewProgressDiagnosticsState\(\)\.diagnostics\)/);
});
