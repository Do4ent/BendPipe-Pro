import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 711: manager history export gate remains canonical and fail-closed",()=>{
  assert.match(ui,/const auditDownloadHistoryExportReadinessSnapshotValid=dimensionAuditDownloadHistoryExportReadinessSnapshotValid/);
  assert.match(ui,/const auditDownloadHistoryExportReady=auditDownloadHistoryExportAuthorizationSnapshotValid&&auditDownloadHistoryExportAuthorization\.allowed/);
});
