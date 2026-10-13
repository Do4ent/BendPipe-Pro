import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 751: canonical history export decision is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportDecision\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportDecision/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportDecisionValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportDecisionValid/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportDecisionSignature\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportDecisionSignatureValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecision:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionValid:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionSignature:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionSignatureValid:/);
});
