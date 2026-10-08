import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 677: history export buttons are disabled when final trust is not trusted",()=>{
  assert.match(ui,/data-copy-dimension-audit-download-history '\+\(auditDownloadHistoryExportReady\?'':'disabled'\)/);
  assert.match(ui,/data-download-dimension-audit-download-history '\+\(auditDownloadHistoryExportReady\?'':'disabled'\)/);
  assert.match(ui,/const auditDownloadHistoryExportReady=auditDownloadHistoryExportReadinessSnapshot\.ready&&auditDownloadHistoryExportReadinessSnapshotValid/);
  assert.match(ui,/data-clear-dimension-audit-download-history '\+\(auditDownloadHistorySummary\.total\?'':'disabled'\)/);
});
