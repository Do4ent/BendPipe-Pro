import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 721: readiness protocol descriptor and signature delegate to domain",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessProtocol\(\)/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessProtocol/);
  assert.match(ui,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessProtocol\(\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessProtocolSignature/);
  assert.match(ui,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(value\)/);
});
