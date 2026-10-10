import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SNAPSHOT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportActionStatus,
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 797: export action status snapshot is self-contained and validated",()=>{
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
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_STATUS_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.status_valid,true);
  assert.equal(snapshot.status_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(snapshot,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotValid({...snapshot,status_valid:false},bindingSnapshot,history,chainSnapshot),false);
});
