import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 722: manager exposes readiness protocol validity metadata",()=>{
  assert.match(ui,/const auditDownloadHistoryExportReadinessProtocolValid=dimensionAuditDownloadHistoryExportReadinessProtocolValid\(auditDownloadHistoryExportReadinessProtocol\)/);
  assert.match(ui,/const auditDownloadHistoryExportReadinessProtocolSignatureValid=dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid\(auditDownloadHistoryExportReadinessProtocolSignature,auditDownloadHistoryExportReadinessProtocol\)/);
  assert.match(ui,/data-history-export-protocol-valid="'\+\(auditDownloadHistoryExportReadinessProtocolValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-protocol-signature-valid="'\+\(auditDownloadHistoryExportReadinessProtocolSignatureValid\?'1':'0'\)\+'"/);
});
