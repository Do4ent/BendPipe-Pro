import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 736: manager exposes history export gate signature metadata",()=>{
  assert.match(ui,/const auditDownloadHistoryExportGateSignature=dimensionAuditDownloadHistoryExportGateSignature\(auditDownloadHistoryExportGate\)/);
  assert.match(ui,/const auditDownloadHistoryExportGateSignatureValid=dimensionAuditDownloadHistoryExportGateSignatureValid\(auditDownloadHistoryExportGateSignature,auditDownloadHistoryExportGate\)/);
  assert.match(ui,/data-history-export-gate-signature="'\+esc\(auditDownloadHistoryExportGateSignature\)\+'"/);
  assert.match(ui,/data-history-export-gate-signature-valid="'\+\(auditDownloadHistoryExportGateSignatureValid\?'1':'0'\)\+'"/);
});
