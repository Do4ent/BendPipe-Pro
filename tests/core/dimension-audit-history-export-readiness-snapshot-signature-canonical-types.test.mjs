import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignature,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1144: readiness snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={
    schema:"s",
    protocol_signature:"p",
    protocol_valid:true,
    protocol_signature_valid:true,
    state_schema:"state",
    state_valid:true,
    ready:true,
    code:"READY",
    attempt_count:1,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"h",
    provenance_signature:"prov",
    signature:"stateSig",
    signature_valid:true
  };
  const malformed={...snapshot,attempt_count:"1"};
  const forged=dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(forged,malformed),false);
});
