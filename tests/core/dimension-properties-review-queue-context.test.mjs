import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 431: Dimension Properties shows review queue diagnostics context",()=>{
  assert.match(properties,/currentCanonicalReviewProgressSnapshot\?\.\(\)/);
  assert.match(properties,/currentReviewProgressDiagnosticsRuntimeState\?\.\(\)/);
  assert.match(properties,/currentReviewProgressDiagnosticsIntegrityState\?\.\(\)/);
  assert.match(properties,/\{name:"Review queue context",rows:\[/);
  assert.match(properties,/\["Diagnostics integrity valid",reviewDiagnosticsIntegrityState\?\.integrity\?\.valid\]/);
  assert.match(properties,/\["Diagnostics parity",reviewDiagnosticsIntegrityState\?\.parity\?\.available===true\?reviewDiagnosticsIntegrityState\?\.parity\?\.consistent:null\]/);
});
