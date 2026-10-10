import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportGateSnapshotSignature,
  dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const canonicalFieldsOnly={
  schema:"TubeBender.DimensionAuditDownloadHistoryExportGateSnapshot.v1",
  gate_signature:"gate",
  gate_valid:true,
  gate_signature_valid:true
};

test("question 1196: gate snapshot signature builder rejects coercible fields",()=>{
  const signature=dimensionAuditDownloadHistoryExportGateSnapshotSignature(canonicalFieldsOnly);
  assert.equal(typeof signature,"string");
  assert.equal(
    dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(signature,canonicalFieldsOnly),
    false,
    "detached field-only gate snapshot cannot satisfy semantic signature validation"
  );
  const malformed={...canonicalFieldsOnly,gate_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportGateSnapshotSignature(malformed),
    {name:"TypeError",message:"history export gate snapshot signature fields must be canonical"}
  );
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid("forged",malformed),false);
});
