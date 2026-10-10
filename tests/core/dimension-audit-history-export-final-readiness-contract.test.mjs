import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 992: real copy button uses canonical final copy readiness",()=>{
  assert.match(ui,/data-copy-dimension-audit-download-history '\+\(auditDownloadHistoryCopyPermitReady\?'':'disabled'\)/);
});

test("question 993: real download button uses canonical final download readiness",()=>{
  assert.match(ui,/data-download-dimension-audit-download-history '\+\(auditDownloadHistoryDownloadPermitReady\?'':'disabled'\)/);
});

test("question 994: final buttons expose per-action permit code diagnostics",()=>{
  assert.match(ui,/title="'\+esc\(auditDownloadHistoryCopyFinalState\.code\)\+'"/);
  assert.match(ui,/title="'\+esc\(auditDownloadHistoryDownloadFinalState\.code\)\+'"/);
});

test("question 995: runtime final readiness routes through canonical helper",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalReady:\(action="copy"\)=>/);
  assert.match(ui,/return dimensionAuditDownloadHistoryExportFinalReady\(action,statusSnapshot,bindingSnapshot,history,chainSnapshot\)/);
});
