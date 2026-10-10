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
  dimensionAuditDownloadHistoryExportActionPermit,
  dimensionAuditDownloadHistoryExportActionPermitSnapshot,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 808: action permit snapshot has deterministic signature",()=>{
  const history={snapshot_signature:"history-sig",attempt_count:2};
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,verification_valid:true,trusted:true,provenance_valid:true,
    history_snapshot_signature:"history-sig",provenance_signature:"prov"
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);
  const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);
  const permit=dimensionAuditDownloadHistoryExportActionPermit("copy",statusSnapshot,bindingSnapshot,history,chainSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot(permit,"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot);
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(snapshot));
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(snapshot,"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotValid({...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"},"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),false);
});
