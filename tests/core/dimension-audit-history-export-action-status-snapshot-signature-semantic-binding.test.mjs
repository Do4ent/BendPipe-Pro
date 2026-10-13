import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionStatus,
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1255: action-status snapshot signature validator binds to nested status signature",()=>{
  const status=dimensionAuditDownloadHistoryExportActionStatus();
  const snapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status);
  const impossible={...snapshot,status_signature:snapshot.status_signature+"x"};
  const forged=dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(forged,impossible),false);
});
