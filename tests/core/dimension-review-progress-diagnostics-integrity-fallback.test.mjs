import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 421: diagnostics integrity fallback is isolated from domain delegation",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsIntegrityFallback\(runtime,stateConsistent=true\)/);
  assert.match(ui,/return dimensionReviewProgressDiagnosticsIntegrityFallback\(runtime,stateConsistent\)/);
  assert.match(ui,/function dimensionReviewProgressDiagnosticsIntegritySignatureFallback\(integrity=\{\}\)/);
  assert.match(ui,/return dimensionReviewProgressDiagnosticsIntegritySignatureFallback\(integrity\)/);
});
