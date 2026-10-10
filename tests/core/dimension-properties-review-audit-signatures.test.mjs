import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 438: Dimension Properties shows review audit schemas and signatures",()=>{
  assert.match(properties,/\["Progress schema",reviewProgressSnapshot\?\.schema\]/);
  assert.match(properties,/\["Progress signature",reviewProgressSnapshot\?\.signature\]/);
  assert.match(properties,/\["Diagnostics schema",reviewDiagnosticsRuntime\?\.snapshot\?\.schema\]/);
  assert.match(properties,/\["Diagnostics signature",reviewDiagnosticsRuntime\?\.signature\]/);
  assert.match(properties,/\["Diagnostics integrity schema",reviewDiagnosticsIntegrityState\?\.integrity\?\.schema\]/);
  assert.match(properties,/\["Diagnostics integrity signature",reviewDiagnosticsIntegrityState\?\.signature\]/);
});
