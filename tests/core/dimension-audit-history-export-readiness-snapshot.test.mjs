import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 694: audit history export readiness has a versioned snapshot",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessSnapshot\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionAuditDownloadHistoryExportReadiness\.v1"/);
  assert.match(fn,/history_snapshot_signature:String\(current\.snapshot_signature\?\?""\)/);
  assert.match(fn,/provenance_signature:dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature\(provenance\)/);
  assert.match(fn,/signature_valid:dimensionAuditDownloadHistoryExportReadinessSignatureValid\(signature,readiness,current\)/);
  assert.match(ui,/data-history-export-state-schema="'\+esc\(auditDownloadHistoryExportReadinessSnapshot\.schema\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSnapshot:\(\)=>dimensionAuditDownloadHistoryExportReadinessSnapshot\(\)/);
});
