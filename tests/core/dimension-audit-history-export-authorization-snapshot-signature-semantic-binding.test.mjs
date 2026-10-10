import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportAuthorization,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshot,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1250: authorization snapshot signature validator binds validity flags to nested authorization",()=>{
  const authorization=dimensionAuditDownloadHistoryExportAuthorization();
  const snapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization);
  const impossible={...snapshot,authorization_valid:!snapshot.authorization_valid};
  const forged=dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(forged,impossible),false);
});
