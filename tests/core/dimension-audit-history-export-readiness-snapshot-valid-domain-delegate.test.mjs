import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 705: UI delegates history readiness snapshot validation to domain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessSnapshotValid\(value=dimensionAuditDownloadHistoryExportReadinessSnapshot\(\),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessSnapshotValid/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessSnapshotValid\(current,readiness\)/);
  assert.match(fn,/TubeBender\.DimensionAuditDownloadHistoryExportReadinessSnapshot\.v1/);
  assert.match(fn,/TubeBender\.DimensionAuditDownloadHistoryExportReadiness\.v1/);
});
