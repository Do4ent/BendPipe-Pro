import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 505: Dimension audit download runtime state is exposed",()=>{
  assert.match(ui,/function dimensionAuditDownloadRuntimeState\(\)/);
  assert.match(ui,/source:dimensionAuditDownloadPolicySource\(\)/);
  assert.match(ui,/consistent:dimensionAuditDownloadPolicyConsistent\(\)/);
  assert.match(ui,/policy_schema:String\(policy\?\.schema\?\?""\)/);
  assert.match(ui,/validation_schema:String\(policy\?\.validation_schema\?\?""\)/);
  assert.match(ui,/dimensionAuditDownloadRuntimeState/);
  assert.match(ui,/dimensionAuditDownloadValidationSchema/);
});
