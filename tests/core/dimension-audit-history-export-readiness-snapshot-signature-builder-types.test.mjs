import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignature,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const canonicalFieldsOnly={
  schema:"TubeBender.DimensionAuditDownloadHistoryExportReadinessSnapshot.v1",
  protocol_signature:"protocol",
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
  history_snapshot_signature:"history",
  provenance_signature:"provenance",
  signature:"state-signature",
  signature_valid:true
};

test("question 1194: readiness snapshot signature builder rejects coercible fields",()=>{
  const signature=dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(canonicalFieldsOnly);
  assert.equal(typeof signature,"string");
  assert.equal(
    dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(signature,canonicalFieldsOnly),
    false,
    "detached field-only readiness snapshot cannot satisfy semantic signature validation"
  );
  const malformed={...canonicalFieldsOnly,attempt_count:"1"};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(malformed),
    {name:"TypeError",message:"history export readiness snapshot signature fields must be canonical"}
  );
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid("forged",malformed),false);
});
