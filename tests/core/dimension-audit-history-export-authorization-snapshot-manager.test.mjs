import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 767: manager exposes signed canonical history export authorization snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryExportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot\(auditDownloadHistoryExportAuthorization\)/);
  assert.match(ui,/const auditDownloadHistoryExportAuthorizationSnapshotValid=dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid\(auditDownloadHistoryExportAuthorizationSnapshot\)/);
  assert.match(ui,/data-history-export-authorization-snapshot-schema="'\+esc\(auditDownloadHistoryExportAuthorizationSnapshot\.schema\)\+'"/);
  assert.match(ui,/data-history-export-authorization-snapshot-valid="'\+\(auditDownloadHistoryExportAuthorizationSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-authorization-snapshot-signature-valid="'\+\(auditDownloadHistoryExportAuthorizationSnapshot\.snapshot_signature_valid\?'1':'0'\)\+'"/);
});
