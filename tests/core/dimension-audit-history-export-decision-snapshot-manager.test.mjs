import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 757: manager exposes signed canonical history export decision snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryExportDecisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot\(auditDownloadHistoryExportDecision\)/);
  assert.match(ui,/const auditDownloadHistoryExportDecisionSnapshotValid=dimensionAuditDownloadHistoryExportDecisionSnapshotValid\(auditDownloadHistoryExportDecisionSnapshot\)/);
  assert.match(ui,/data-history-export-decision-snapshot-schema="'\+esc\(auditDownloadHistoryExportDecisionSnapshot\.schema\)\+'"/);
  assert.match(ui,/data-history-export-decision-snapshot-valid="'\+\(auditDownloadHistoryExportDecisionSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-decision-snapshot-signature-valid="'\+\(auditDownloadHistoryExportDecisionSnapshot\.snapshot_signature_valid\?'1':'0'\)\+'"/);
});
