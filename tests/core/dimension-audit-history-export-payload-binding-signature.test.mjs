import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingValid,
  dimensionAuditDownloadHistoryExportPayloadBindingSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 780: export payload binding is validated and deterministically signed",()=>{
  const history={snapshot_signature:"history-sig",attempt_count:2};
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,verification_valid:true,trusted:true,provenance_valid:true,
    history_snapshot_signature:"history-sig",provenance_signature:"prov"
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const signature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(binding);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingValid(binding,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature,binding,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingValid({...binding,history_snapshot_signature:"other"},history,chainSnapshot),false);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature+"x",binding,history,chainSnapshot),false);
});
