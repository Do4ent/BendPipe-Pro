import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 714: history readiness protocol descriptor is exposed for QA",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessProtocol\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/TubeBender\.DimensionAuditDownloadHistoryExportReadinessProtocol\.v1/);
  assert.match(fn,/DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA/);
  assert.match(fn,/DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SNAPSHOT_SCHEMA/);
  assert.match(fn,/DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessProtocol:\(\)=>dimensionAuditDownloadHistoryExportReadinessProtocol\(\)/);
});
