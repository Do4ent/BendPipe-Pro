import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportActionStatus,
  dimensionAuditDownloadHistoryExportActionStatusValid,
  dimensionAuditDownloadHistoryExportActionStatusSignature,
  dimensionAuditDownloadHistoryExportActionStatusSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 793: export action status is validated and deterministically signed",()=>{
  const history={snapshot_signature:"history-sig",attempt_count:2};
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,verification_valid:true,trusted:true,provenance_valid:true,
    history_snapshot_signature:"history-sig",provenance_signature:"prov"
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);
  const signature=dimensionAuditDownloadHistoryExportActionStatusSignature(status);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusValid(status,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature,status,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusValid({...status,ready:false},bindingSnapshot,history,chainSnapshot),false);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature+"x",status,bindingSnapshot,history,chainSnapshot),false);
});
