import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 990-991: manager and runtime use canonical final readiness",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportFinalReady\(/);
  assert.match(ui,/if\(typeof action!=="string"\)return false/);
  assert.match(ui,/if\(!\["copy","download"\]\.includes\(normalizedAction\)\)return false/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportFinalReady/);
  assert.match(ui,/const auditDownloadHistoryCopyPermitReady=dimensionAuditDownloadHistoryExportFinalReady\("copy"/);
  assert.match(ui,/const auditDownloadHistoryDownloadPermitReady=dimensionAuditDownloadHistoryExportFinalReady\("download"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalReady:\(action="copy"\)=>/);
});
