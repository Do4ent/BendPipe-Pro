import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 716: manager exposes history readiness protocol metadata",()=>{
  assert.match(ui,/const auditDownloadHistoryExportReadinessProtocol=dimensionAuditDownloadHistoryExportReadinessProtocol\(\)/);
  assert.match(ui,/const auditDownloadHistoryExportReadinessProtocolSignature=dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(auditDownloadHistoryExportReadinessProtocol\)/);
  assert.match(ui,/data-history-export-protocol-schema="'\+esc\(auditDownloadHistoryExportReadinessProtocol\.schema\)\+'"/);
  assert.match(ui,/data-history-export-protocol-signature="'\+esc\(auditDownloadHistoryExportReadinessProtocolSignature\)\+'"/);
});
