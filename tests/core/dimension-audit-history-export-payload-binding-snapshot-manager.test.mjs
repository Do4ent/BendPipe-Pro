import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 787: manager exposes signed export payload binding snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryExportPayloadBindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(/);
  assert.match(ui,/const auditDownloadHistoryExportPayloadBindingSnapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid\(/);
  assert.match(ui,/data-history-export-payload-binding-snapshot-schema="'\+esc\(auditDownloadHistoryExportPayloadBindingSnapshot\.schema\)\+'"/);
  assert.match(ui,/data-history-export-payload-binding-snapshot-valid="'\+\(auditDownloadHistoryExportPayloadBindingSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-payload-binding-snapshot-signature-valid="'\+\(auditDownloadHistoryExportPayloadBindingSnapshot\.snapshot_signature_valid\?'1':'0'\)\+'"/);
});
