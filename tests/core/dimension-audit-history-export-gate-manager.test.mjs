import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 732: manager exposes canonical history export gate metadata",()=>{
  assert.match(ui,/const auditDownloadHistoryExportGate=dimensionAuditDownloadHistoryExportGate\(auditDownloadHistoryExportReadinessSnapshot,auditDownloadHistorySnapshot\)/);
  assert.match(ui,/data-history-export-gate-schema="'\+esc\(auditDownloadHistoryExportGate\.schema\)\+'"/);
  assert.match(ui,/data-history-export-gate-allowed="'\+\(auditDownloadHistoryExportGate\.allowed\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-gate-code="'\+esc\(auditDownloadHistoryExportGate\.code\)\+'"/);
});
