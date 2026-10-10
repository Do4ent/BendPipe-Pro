import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 704: UI delegates history readiness snapshot to domain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessSnapshot\(snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessSnapshot/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessSnapshot\(readiness\)/);
  assert.match(fn,/schema:"TubeBender\.DimensionAuditDownloadHistoryExportReadinessSnapshot\.v1"/);
  assert.match(fn,/state_schema:"TubeBender\.DimensionAuditDownloadHistoryExportReadiness\.v1"/);
});
