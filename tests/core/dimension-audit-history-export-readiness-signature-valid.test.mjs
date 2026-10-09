import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 693: audit history export readiness signature is validated",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessSignatureValid/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessStateSignatureValid/);
  assert.match(ui,/if\(typeof signature!=="string"\|\|signature\.length===0\)return false/);\n  assert.match(ui,/signature===dimensionAuditDownloadHistoryExportReadinessSignature\(readiness,snapshot\)/);
  assert.match(ui,/data-history-export-signature-valid="'\+\(auditDownloadHistoryExportReadinessSnapshot\.signature_valid\?'1':'0'\)\+'"/);
  assert.match(ui,/const auditDownloadHistoryExportReady=auditDownloadHistoryExportAuthorizationSnapshotValid&&auditDownloadHistoryExportAuthorization\.allowed/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSignatureValid:\(\)=>dimensionAuditDownloadHistoryExportReadinessSignatureValid\(\)/);
});
