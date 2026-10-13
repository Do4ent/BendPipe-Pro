import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 743: manager exposes history export gate snapshot metadata",()=>{
  assert.match(ui,/const auditDownloadHistoryExportGateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot\(auditDownloadHistoryExportGate\)/);
  assert.match(ui,/const auditDownloadHistoryExportGateSnapshotValid=dimensionAuditDownloadHistoryExportGateSnapshotValid\(auditDownloadHistoryExportGateSnapshot\)/);
  assert.match(ui,/data-history-export-gate-snapshot-schema="'\+esc\(auditDownloadHistoryExportGateSnapshot\.schema\)\+'"/);
  assert.match(ui,/data-history-export-gate-snapshot-valid="'\+\(auditDownloadHistoryExportGateSnapshotValid\?'1':'0'\)\+'"/);
});
