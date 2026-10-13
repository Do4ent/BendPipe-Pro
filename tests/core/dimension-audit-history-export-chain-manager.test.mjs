import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 773: manager exposes signed canonical history export chain",()=>{
  assert.match(ui,/const auditDownloadHistoryExportChain=dimensionAuditDownloadHistoryExportChain\(auditDownloadHistorySnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryExportChainValid=dimensionAuditDownloadHistoryExportChainValid\(auditDownloadHistoryExportChain\)/);
  assert.match(ui,/const auditDownloadHistoryExportChainSignature=dimensionAuditDownloadHistoryExportChainSignature\(auditDownloadHistoryExportChain\)/);
  assert.match(ui,/const auditDownloadHistoryExportChainSignatureValid=dimensionAuditDownloadHistoryExportChainSignatureValid\(auditDownloadHistoryExportChainSignature,auditDownloadHistoryExportChain\)/);
  assert.match(ui,/data-history-export-chain-schema="'\+esc\(auditDownloadHistoryExportChain\.schema\)\+'"/);
  assert.match(ui,/data-history-export-chain-code="'\+esc\(auditDownloadHistoryExportChain\.code\)\+'"/);
  assert.match(ui,/data-history-export-chain-valid="'\+\(auditDownloadHistoryExportChainValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-chain-signature-valid="'\+\(auditDownloadHistoryExportChainSignatureValid\?'1':'0'\)\+'"/);
});
