import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 422: diagnostics integrity compares domain and fallback signatures",()=>{
  assert.match(ui,/function dimensionReviewProgressDiagnosticsIntegrityParity\(runtime,stateConsistent=true\)/);
  assert.match(ui,/fallback_signature:fallbackSignature/);
  assert.match(ui,/domain_signature:domainSignature/);
  assert.match(ui,/consistent:domainSignature===fallbackSignature/);
  assert.match(ui,/currentReviewProgressDiagnosticsIntegrityParity:/);
});
