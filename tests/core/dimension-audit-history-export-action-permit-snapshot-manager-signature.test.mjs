import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 813: manager exposes permit snapshot signature validity for both actions",()=>{
  assert.match(ui,/const auditDownloadHistoryCopyPermitSnapshotSignatureValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid\(/);
  assert.match(ui,/const auditDownloadHistoryDownloadPermitSnapshotSignatureValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid\(/);
  assert.match(ui,/data-history-export-copy-permit-snapshot-signature-valid="'\+\(auditDownloadHistoryCopyPermitSnapshotSignatureValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-download-permit-snapshot-signature-valid="'\+\(auditDownloadHistoryDownloadPermitSnapshotSignatureValid\?'1':'0'\)\+'"/);
});
