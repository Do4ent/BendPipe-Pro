import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 695: audit history export readiness snapshot is validated",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessSnapshotValid/);
  assert.match(ui,/TubeBender\.DimensionAuditDownloadHistoryExportReadiness\.v1/);
  assert.match(ui,/current\.ready===expected\.ready/);
  assert.match(ui,/current\.signature_valid===true/);
  assert.match(ui,/data-history-export-state-valid="'\+\(auditDownloadHistoryExportReadinessSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSnapshotValid:\(\)=>dimensionAuditDownloadHistoryExportReadinessSnapshotValid\(\)/);
});
