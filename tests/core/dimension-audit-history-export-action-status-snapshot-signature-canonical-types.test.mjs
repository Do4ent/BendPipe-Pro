import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1150: action-status snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",status_signature:"st",status_valid:true,status_signature_valid:true};
  const malformed={...snapshot,status_valid:1};
  const forged=dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(forged,malformed),false);
});
