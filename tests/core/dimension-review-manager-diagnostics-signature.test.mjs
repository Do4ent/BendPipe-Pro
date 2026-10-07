import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 395: Saved Dimensions exposes review diagnostics signature metadata",()=>{
  assert.match(ui,/const managerReviewDiagnosticsSignature=dimensionReviewProgressDiagnosticsSignature\(managerReviewDiagnosticsModel\)/);
  assert.match(ui,/data-review-diagnostics-signature="'\+esc\(managerReviewDiagnosticsSignature\)\+'"/);
});
