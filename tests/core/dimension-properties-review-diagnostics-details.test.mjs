import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 432: Dimension Properties shows review diagnostics details",()=>{
  assert.match(properties,/\["Diagnostics status",reviewDiagnosticsRuntime\?\.diagnostics\?\.status\]/);
  assert.match(properties,/\["Diagnostics issue count",reviewDiagnosticsRuntime\?\.diagnostics\?\.issue_count\]/);
  assert.match(properties,/\["Diagnostics primary error",reviewDiagnosticsRuntime\?\.diagnostics\?\.primary_error\]/);
  assert.match(properties,/\["Diagnostics errors",reviewDiagnosticsRuntime\?\.diagnostics\?\.errors\?\?\[\]\]/);
  assert.match(properties,/\["Diagnostics snapshot signature consistent",reviewDiagnosticsRuntime\?\.snapshot_signature_consistent\]/);
});
