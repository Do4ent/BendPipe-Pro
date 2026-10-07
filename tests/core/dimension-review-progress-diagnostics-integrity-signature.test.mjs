import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 416: review diagnostics integrity has deterministic signature",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsIntegritySignature\(integrity=\{\}\)/);
  assert.match(ui,/review_progress_diagnostics_integrity_signature:dimensionReviewProgressDiagnosticsIntegritySignature/);
  assert.match(ui,/data-review-diagnostics-integrity-signature="'\+esc\(managerReviewDiagnosticsIntegritySignature\)\+'"/);
  assert.match(ui,/currentReviewProgressDiagnosticsIntegritySignature:/);
});
