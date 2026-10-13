import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 720: history readiness protocol validation is exposed through UI adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessProtocolValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessProtocolValid/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessProtocolValid:\(\)=>dimensionAuditDownloadHistoryExportReadinessProtocolValid\(\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid:\(\)=>dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid\(\)/);
});
