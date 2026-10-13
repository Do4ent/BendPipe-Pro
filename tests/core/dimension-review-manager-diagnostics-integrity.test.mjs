import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 415: manager exposes review diagnostics integrity validity",()=>{
  assert.match(ui,/const managerReviewDiagnosticsIntegrity=dimensionReviewProgressDiagnosticsIntegrity\(/);
  assert.match(ui,/data-review-diagnostics-integrity-valid="'\+\(managerReviewDiagnosticsIntegrity\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/diag-integrity '\+\(managerReviewDiagnosticsIntegrity\.valid\?'valid':'invalid'\)/);
});
