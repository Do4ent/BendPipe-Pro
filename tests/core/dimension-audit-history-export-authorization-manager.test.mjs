import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 763: manager exposes signed canonical history export authorization",()=>{
  assert.match(ui,/const auditDownloadHistoryExportAuthorization=dimensionAuditDownloadHistoryExportAuthorization\(auditDownloadHistoryExportDecisionSnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryExportAuthorizationValid=dimensionAuditDownloadHistoryExportAuthorizationValid\(auditDownloadHistoryExportAuthorization\)/);
  assert.match(ui,/const auditDownloadHistoryExportAuthorizationSignature=dimensionAuditDownloadHistoryExportAuthorizationSignature\(auditDownloadHistoryExportAuthorization\)/);
  assert.match(ui,/const auditDownloadHistoryExportAuthorizationSignatureValid=dimensionAuditDownloadHistoryExportAuthorizationSignatureValid\(auditDownloadHistoryExportAuthorizationSignature,auditDownloadHistoryExportAuthorization\)/);
  assert.match(ui,/data-history-export-authorization-schema="'\+esc\(auditDownloadHistoryExportAuthorization\.schema\)\+'"/);
  assert.match(ui,/data-history-export-authorization-code="'\+esc\(auditDownloadHistoryExportAuthorization\.code\)\+'"/);
  assert.match(ui,/data-history-export-authorization-valid="'\+\(auditDownloadHistoryExportAuthorizationValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-authorization-signature-valid="'\+\(auditDownloadHistoryExportAuthorizationSignatureValid\?'1':'0'\)\+'"/);
});
