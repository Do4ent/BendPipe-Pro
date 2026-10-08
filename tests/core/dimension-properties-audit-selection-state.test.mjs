import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 435: Dimension Properties shows current audit selection state",()=>{
  assert.match(properties,/const selectedDimensionAuditIds=audit\?\.selectedDimensionAuditIds\?\.\(\)\?\?\[\]/);
  assert.match(properties,/const selectedInAudit=selectedDimensionAuditIds\.map\(id=>String\(id\)\)\.includes\(String\(dimension\?\.id\?\?""\)\)/);
  assert.match(properties,/selected_in_audit:canonicalReviewContext\?\.selected_in_audit\?\?selectedInAudit/);
  assert.match(properties,/\["Selected in audit",reviewDisplay\.selected_in_audit\]/);
});
