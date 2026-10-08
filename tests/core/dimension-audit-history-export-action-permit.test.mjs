import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportActionStatus,
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportActionPermit
} from "../../src/domain/measurements/audit-download.mjs";

function fixture(){
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
  return {history,chainSnapshot,bindingSnapshot,statusSnapshot};
}

test("question 802: export action permit is action-specific and derives final ready/code",()=>{
  const x=fixture();
  const copy=dimensionAuditDownloadHistoryExportActionPermit("copy",x.statusSnapshot,x.bindingSnapshot,x.history,x.chainSnapshot);
  const download=dimensionAuditDownloadHistoryExportActionPermit("download",x.statusSnapshot,x.bindingSnapshot,x.history,x.chainSnapshot);
  assert.equal(copy.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_ACTION_PERMIT_SCHEMA);
  assert.equal(copy.action,"copy");
  assert.equal(download.action,"download");
  assert.equal(copy.ready,true);
  assert.equal(download.ready,true);
  assert.equal(copy.code,"READY");
});
