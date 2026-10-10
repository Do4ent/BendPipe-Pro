import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SNAPSHOT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportActionStatus,
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportActionPermit,
  dimensionAuditDownloadHistoryExportActionPermitSnapshot,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 807: action permit snapshot is self-contained and validated",()=>{
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
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.permit_valid,true);
  assert.equal(snapshot.permit_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotValid(snapshot,"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotValid({...snapshot,permit_valid:false},"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),false);
});
