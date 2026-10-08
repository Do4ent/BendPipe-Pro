import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 688: audit history export readiness is machine-readable",()=>{
  assert.match(ui,/const auditDownloadHistoryExportReadiness=dimensionAuditDownloadHistoryExportReadiness\(auditDownloadHistorySnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryExportReady=auditDownloadHistoryExportReadinessSnapshot\.ready&&auditDownloadHistoryExportReadinessSnapshotValid/);
  assert.match(ui,/data-history-export-ready="'\+\(auditDownloadHistoryExportReady\?'1':'0'\)\+'"/);
  assert.match(ui,/data-copy-dimension-audit-download-history '\+\(auditDownloadHistoryExportReady\?'':'disabled'\)/);
  assert.match(ui,/data-download-dimension-audit-download-history '\+\(auditDownloadHistoryExportReady\?'':'disabled'\)/);
});
