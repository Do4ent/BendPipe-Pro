import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 681: audit history snapshot source is exposed in manager and QA API",()=>{
  assert.match(ui,/function dimensionAuditDownloadAttemptHistoryAuditSnapshotSource\(\)/);
  assert.match(ui,/return auditDownloadDomain\?\.dimensionAuditDownloadHistorySnapshot\?"domain":"ui-fallback"/);
  assert.match(ui,/data-history-snapshot-source="'\+esc\(auditDownloadHistorySnapshotSource\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryAuditSnapshotSource:\(\)=>dimensionAuditDownloadAttemptHistoryAuditSnapshotSource\(\)/);
});
