import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 692: audit history export readiness is signed and exposed",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessSignature/);
  assert.match(ui,/snapshot_signature:String\(current\.snapshot_signature\?\?""\)/);
  assert.match(ui,/provenance_signature:dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature\(provenance\)/);
  assert.match(ui,/data-history-export-signature="'\+esc\(auditDownloadHistoryExportReadinessSignature\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSignature:\(\)=>dimensionAuditDownloadHistoryExportReadinessSignature\(\)/);
});
