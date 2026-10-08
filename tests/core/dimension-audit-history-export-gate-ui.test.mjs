import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 731: copy and download history use canonical export gate",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGate\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGate/);
  assert.match(ui,/const exportGate=dimensionAuditDownloadHistoryExportGate\(exportState,snapshot\)/);
  assert.match(ui,/const exportGateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot\(exportGate\)/);
  assert.match(ui,/const exportDecision=dimensionAuditDownloadHistoryExportDecision\(exportGateSnapshot\)/);
  assert.match(ui,/const exportAuthorization=dimensionAuditDownloadHistoryExportAuthorization\(exportDecisionSnapshot\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGate:\(\)=>dimensionAuditDownloadHistoryExportGate\(\)/);
});
