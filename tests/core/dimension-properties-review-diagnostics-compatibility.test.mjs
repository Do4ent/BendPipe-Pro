import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 439: Dimension Properties shows diagnostics domain compatibility",()=>{
  assert.match(properties,/\["Diagnostics domain available",reviewDiagnosticsRuntime\?\.domain_available\]/);
  assert.match(properties,/\["Diagnostics domain compatible",reviewDiagnosticsRuntime\?\.domain_compatible\]/);
  assert.match(properties,/\["Diagnostics domain status",reviewDiagnosticsRuntime\?\.domain_status\]/);
  assert.match(properties,/\["Diagnostics available",reviewDiagnosticsRuntime\?\.diagnostics_available\]/);
});
