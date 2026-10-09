import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1152: final-state snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",state_signature:"st",state_valid:true,state_signature_valid:true};
  const malformed={...snapshot,state_valid:1};
  const forged=dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(forged,malformed),false);
});
