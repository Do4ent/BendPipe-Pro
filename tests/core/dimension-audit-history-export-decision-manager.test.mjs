import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 753: manager exposes signed canonical history export decision",()=>{
  assert.match(ui,/const auditDownloadHistoryExportDecision=dimensionAuditDownloadHistoryExportDecision\(auditDownloadHistoryExportGateSnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryExportDecisionValid=dimensionAuditDownloadHistoryExportDecisionValid\(auditDownloadHistoryExportDecision\)/);
  assert.match(ui,/const auditDownloadHistoryExportDecisionSignature=dimensionAuditDownloadHistoryExportDecisionSignature\(auditDownloadHistoryExportDecision\)/);
  assert.match(ui,/const auditDownloadHistoryExportDecisionSignatureValid=dimensionAuditDownloadHistoryExportDecisionSignatureValid\(auditDownloadHistoryExportDecisionSignature,auditDownloadHistoryExportDecision\)/);
  assert.match(ui,/data-history-export-decision-schema="'\+esc\(auditDownloadHistoryExportDecision\.schema\)\+'"/);
  assert.match(ui,/data-history-export-decision-code="'\+esc\(auditDownloadHistoryExportDecision\.code\)\+'"/);
  assert.match(ui,/data-history-export-decision-valid="'\+\(auditDownloadHistoryExportDecisionValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-decision-signature-valid="'\+\(auditDownloadHistoryExportDecisionSignatureValid\?'1':'0'\)\+'"/);
});
