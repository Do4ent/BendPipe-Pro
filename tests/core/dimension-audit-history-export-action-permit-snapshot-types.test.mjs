import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionPermit,
  dimensionAuditDownloadHistoryExportActionPermitSnapshot,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotValid,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 986-987: action permit snapshot rejects coerced fields and signature",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(dimensionAuditDownloadHistoryExportActionPermit());
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotValid({...snapshot,permit_valid:"true"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotValid({...snapshot,snapshot_signature:123}),false);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid({toString:()=>snapshot.snapshot_signature},snapshot),false);
});
