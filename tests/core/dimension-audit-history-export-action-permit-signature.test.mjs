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
  dimensionAuditDownloadHistoryExportActionPermitValid,
  dimensionAuditDownloadHistoryExportActionPermitSignature,
  dimensionAuditDownloadHistoryExportActionPermitSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 803: export action permit is validated and deterministically signed",()=>{
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
  const signature=dimensionAuditDownloadHistoryExportActionPermitSignature(permit);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitValid(permit,"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature,permit,"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitValid({...permit,action:"download"},"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),false);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature+"x",permit,"copy",statusSnapshot,bindingSnapshot,history,chainSnapshot),false);
});
