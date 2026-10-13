import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SNAPSHOT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 784: export payload binding snapshot is self-contained and validated",()=>{
  const history={snapshot_signature:"history-sig",attempt_count:2};
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,verification_valid:true,trusted:true,provenance_valid:true,
    history_snapshot_signature:"history-sig",provenance_signature:"prov"
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_PAYLOAD_BINDING_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.binding_valid,true);
  assert.equal(snapshot.binding_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid({...snapshot,binding_valid:false},history,chainSnapshot),false);
});
