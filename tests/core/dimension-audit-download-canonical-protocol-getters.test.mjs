import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 508: audit download protocol getters use canonical domain values with fallback",()=>{
  assert.match(ui,/function dimensionAuditFilenamePolicy\(\)/);
  assert.match(ui,/auditDownloadDomain\?\.DIMENSION_AUDIT_FILENAME_POLICY\?\?DIMENSION_AUDIT_FILENAME_POLICY/);
  assert.match(ui,/function dimensionAuditDownloadSchemas\(\)/);
  assert.match(ui,/auditDownloadDomain\?\.DIMENSION_AUDIT_DOWNLOAD_SCHEMAS\?\?DIMENSION_AUDIT_DOWNLOAD_SCHEMAS/);
  assert.match(ui,/function dimensionAuditDownloadValidationCodes\(\)/);
  assert.match(ui,/auditDownloadDomain\?\.DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES\?\?DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES/);
  assert.match(ui,/function dimensionAuditDownloadValidationSchema\(\)/);
});
