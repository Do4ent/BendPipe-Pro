import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 814: manager derives strongest final readiness per action",()=>{
  assert.match(ui,/const auditDownloadHistoryCopyPermitReady=auditDownloadHistoryCopyFinalStateSnapshotValid&&auditDownloadHistoryCopyFinalState\.ready/);
  assert.match(ui,/const auditDownloadHistoryDownloadPermitReady=auditDownloadHistoryDownloadFinalStateSnapshotValid&&auditDownloadHistoryDownloadFinalState\.ready/);
  assert.match(ui,/data-history-export-copy-permit-ready-final="'\+\(auditDownloadHistoryCopyPermitReady\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-download-permit-ready-final="'\+\(auditDownloadHistoryDownloadPermitReady\?'1':'0'\)\+'"/);
});
