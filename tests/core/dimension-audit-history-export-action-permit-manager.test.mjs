import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 805: manager exposes separate copy and download permit state",()=>{
  assert.match(ui,/const auditDownloadHistoryCopyPermit=dimensionAuditDownloadHistoryExportActionPermit\("copy"/);
  assert.match(ui,/const auditDownloadHistoryDownloadPermit=dimensionAuditDownloadHistoryExportActionPermit\("download"/);
  assert.match(ui,/data-history-export-copy-permit-ready="'\+\(auditDownloadHistoryCopyPermit\.ready\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-copy-permit-valid="'\+\(auditDownloadHistoryCopyPermitValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-download-permit-ready="'\+\(auditDownloadHistoryDownloadPermit\.ready\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-download-permit-valid="'\+\(auditDownloadHistoryDownloadPermitValid\?'1':'0'\)\+'"/);
});
