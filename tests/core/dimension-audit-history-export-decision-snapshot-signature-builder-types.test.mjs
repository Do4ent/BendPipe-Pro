import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignature,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const canonicalFieldsOnly={
  schema:"TubeBender.DimensionAuditDownloadHistoryExportDecisionSnapshot.v1",
  decision_signature:"decision",
  decision_valid:true,
  decision_signature_valid:true
};

test("question 1198: decision snapshot signature builder rejects coercible fields",()=>{
  const signature=dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(canonicalFieldsOnly);
  assert.equal(typeof signature,"string");
  assert.equal(
    dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(signature,canonicalFieldsOnly),
    false,
    "detached field-only decision snapshot cannot satisfy semantic signature validation"
  );
  const malformed={...canonicalFieldsOnly,decision_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(malformed),
    {name:"TypeError",message:"history export decision snapshot signature fields must be canonical"}
  );
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid("forged",malformed),false);
});
