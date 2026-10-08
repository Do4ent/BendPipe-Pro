import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 509: audit download canonical getters are protocol-consistent",()=>{
  assert.match(ui,/function dimensionAuditDownloadProtocolConsistent\(\)/);
  assert.match(ui,/dimensionAuditDownloadValidationSchema\(\)/);
  assert.match(ui,/dimensionAuditDownloadValidationCodes\(\)/);
  assert.match(ui,/dimensionAuditDownloadSchemas\(\)/);
  assert.match(ui,/dimensionAuditFilenamePolicy\(\)/);
  assert.match(ui,/protocol_consistent:dimensionAuditDownloadProtocolConsistent\(\)/);
  assert.match(ui,/dimensionAuditDownloadPolicyConsistent,dimensionAuditDownloadProtocolConsistent/);
});
