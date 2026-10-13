import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 777: manager exposes signed canonical history export chain snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryExportChainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(auditDownloadHistoryExportChain\)/);
  assert.match(ui,/const auditDownloadHistoryExportChainSnapshotValid=dimensionAuditDownloadHistoryExportChainSnapshotValid\(auditDownloadHistoryExportChainSnapshot\)/);
  assert.match(ui,/data-history-export-chain-snapshot-schema="'\+esc\(auditDownloadHistoryExportChainSnapshot\.schema\)\+'"/);
  assert.match(ui,/data-history-export-chain-snapshot-valid="'\+\(auditDownloadHistoryExportChainSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-chain-snapshot-signature-valid="'\+\(auditDownloadHistoryExportChainSnapshot\.snapshot_signature_valid\?'1':'0'\)\+'"/);
});
