import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 786: export payload binding snapshot is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportPayloadBindingSnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid:/);
});
