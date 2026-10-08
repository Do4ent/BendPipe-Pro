import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 685: audit history snapshot provenance is self-validated",()=>{
  assert.match(ui,/function dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid\(/);
  assert.match(ui,/TubeBender\.DimensionAuditDownloadHistorySnapshotProvenance\.v1/);
  assert.match(ui,/value\.envelope_valid===dimensionAuditDownloadAttemptHistoryEnvelopeValid\(currentSnapshot\)/);
  assert.match(ui,/value\.verification_valid===dimensionAuditDownloadHistoryVerification\(currentSnapshot\)\.valid/);
  assert.match(ui,/value\.trusted===dimensionAuditDownloadHistoryTrust\(currentSnapshot\)\.trusted/);
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySnapshotProvenanceValid:\(\)=>dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid\(\)/);
});
