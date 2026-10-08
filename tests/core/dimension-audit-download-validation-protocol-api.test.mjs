import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 497: Dimension audit validation protocol metadata is exposed",()=>{
  assert.match(ui,/function dimensionAuditDownloadValidationSchema\(\)/);
  assert.match(ui,/auditDownloadDomain\?\.DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA\?\?DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA/);
  assert.match(ui,/dimensionAuditDownloadValidationSchema,dimensionAuditDownloadValidationCodes/);
});
