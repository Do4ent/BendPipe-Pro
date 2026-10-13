import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 785: export payload binding snapshot has deterministic signature",()=>{
  const history={snapshot_signature:"history-sig",attempt_count:2};
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,verification_valid:true,trusted:true,provenance_valid:true,
    history_snapshot_signature:"history-sig",provenance_signature:"prov"
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(snapshot));
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid({...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"},history,chainSnapshot),false);
});
