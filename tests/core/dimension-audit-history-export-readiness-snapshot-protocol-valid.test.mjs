import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 724: readiness snapshot validation fails closed on protocol tampering",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid(snapshot,state),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid({...snapshot,protocol:{...snapshot.protocol,schema:"bad"}},state),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid({...snapshot,protocol_signature:snapshot.protocol_signature+"x"},state),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid({...snapshot,protocol_valid:false},state),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid({...snapshot,protocol_signature_valid:false},state),false);
});
