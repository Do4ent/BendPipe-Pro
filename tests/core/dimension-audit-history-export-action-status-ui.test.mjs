import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 794: export action status is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionStatus\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportActionStatus/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionStatusValid\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionStatusSignature\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionStatusSignatureValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatus:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusValid:/);
});
