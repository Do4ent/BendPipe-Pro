import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 789: manager derives strongest export action readiness from payload binding snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryExportReady=auditDownloadHistoryExportAuthorizationSnapshotValid&&auditDownloadHistoryExportAuthorization\.allowed/);
  assert.match(ui,/const auditDownloadHistoryExportActionReady=auditDownloadHistoryExportPayloadBindingSnapshotValid&&auditDownloadHistoryExportPayloadBinding\.allowed/);
  assert.match(ui,/data-history-export-action-ready="'\+\(auditDownloadHistoryExportActionReady\?'1':'0'\)\+'"/);
});
