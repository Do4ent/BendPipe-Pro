import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 810: manager exposes copy and download permit snapshots",()=>{
  assert.match(ui,/const auditDownloadHistoryCopyPermitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot\(/);
  assert.match(ui,/const auditDownloadHistoryDownloadPermitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot\(/);
  assert.match(ui,/data-history-export-copy-permit-snapshot-valid="'\+\(auditDownloadHistoryCopyPermitSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-download-permit-snapshot-valid="'\+\(auditDownloadHistoryDownloadPermitSnapshotValid\?'1':'0'\)\+'"/);
});
