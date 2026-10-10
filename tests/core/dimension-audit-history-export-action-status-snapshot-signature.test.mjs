import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportActionStatus,
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 798: export action status snapshot has deterministic signature",()=>{
  const history={snapshot_signature:"history-sig",attempt_count:2};
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,verification_valid:true,trusted:true,provenance_valid:true,
    history_snapshot_signature:"history-sig",provenance_signature:"prov"
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(snapshot));
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(snapshot,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotValid({...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"},bindingSnapshot,history,chainSnapshot),false);
});
