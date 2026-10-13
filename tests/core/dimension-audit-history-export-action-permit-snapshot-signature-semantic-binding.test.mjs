import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionPermit,
  dimensionAuditDownloadHistoryExportActionPermitSnapshot,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1256: action-permit snapshot signature validator binds to nested permit signature",()=>{
  const permit=dimensionAuditDownloadHistoryExportActionPermit();
  const snapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit);
  const impossible={...snapshot,permit_signature:snapshot.permit_signature+"x"};
  const forged=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(forged,impossible),false);
});
