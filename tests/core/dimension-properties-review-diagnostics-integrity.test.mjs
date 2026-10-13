import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 440: Dimension Properties shows diagnostics integrity components",()=>{
  assert.match(properties,/\["Diagnostics state consistent",reviewDiagnosticsIntegrityState\?\.integrity\?\.state_consistent\]/);
  assert.match(properties,/\["Diagnostics snapshot signature consistent",reviewDiagnosticsIntegrityState\?\.integrity\?\.snapshot_signature_consistent\]/);
  assert.match(properties,/\["Diagnostics integrity runtime valid",reviewDiagnosticsIntegrityState\?\.integrity\?\.runtime_valid\]/);
  assert.match(properties,/\["Diagnostics parity available",reviewDiagnosticsIntegrityState\?\.parity\?\.available\]/);
  assert.match(properties,/\["Diagnostics integrity valid",reviewDiagnosticsIntegrityState\?\.integrity\?\.valid\]/);
});
