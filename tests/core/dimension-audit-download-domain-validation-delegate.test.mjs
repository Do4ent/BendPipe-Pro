import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 502: audit download validators delegate to domain with UI fallback",()=>{
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadSnapshotShapeSupported/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadFilenameSupported/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadSchemaSupported/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadValidation/);
});
