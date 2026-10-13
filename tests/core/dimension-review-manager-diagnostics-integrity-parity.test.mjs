import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 424: manager exposes diagnostics integrity parity",()=>{
  assert.match(ui,/const managerReviewDiagnosticsIntegrityParity=dimensionReviewProgressDiagnosticsIntegrityParity\(/);
  assert.match(ui,/data-review-diagnostics-integrity-parity="'\+\(!managerReviewDiagnosticsIntegrityParity\.available\?'na':managerReviewDiagnosticsIntegrityParity\.consistent\?'1':'0'\)\+'"/);
  assert.match(ui,/diag-parity '\+\(!managerReviewDiagnosticsIntegrityParity\.available\?'na':managerReviewDiagnosticsIntegrityParity\.consistent\?'aligned':'diverged'\)/);
});
