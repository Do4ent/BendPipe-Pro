import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 709: UI exposes readiness state validity with domain delegation",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessStateValid\(state=dimensionAuditDownloadHistoryExportReadiness\(\),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessStateValid/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessStateValid\(value\)/);
  assert.match(ui,/state_valid:dimensionAuditDownloadHistoryExportReadinessStateValid\(readiness,current\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessStateValid:\(\)=>dimensionAuditDownloadHistoryExportReadinessStateValid\(\)/);
});
