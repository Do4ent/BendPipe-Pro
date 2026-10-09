import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
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

function fixture(){
  const history=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:history.attempt_count,
    history_snapshot_signature:history.snapshot_signature
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  return {history,chainSnapshot,bindingSnapshot};
}

test("questions 980-981: action status rejects coerced fields and signature",()=>{
  const {history,chainSnapshot,bindingSnapshot}=fixture();
  const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusValid(status,bindingSnapshot,history,chainSnapshot),true);
  for(const [field,value] of [
    ["schema",new String(status.schema)],
    ["ready",1],
    ["code",new String(status.code)],
    ["payload_binding_snapshot_valid",1],
    ["payload_binding_allowed",1],
    ["payload_binding_snapshot_signature",new String(status.payload_binding_snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportActionStatusValid({...status,[field]:value},bindingSnapshot,history,chainSnapshot),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportActionStatusSignature(status);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSignatureValid(signature,status,bindingSnapshot,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSignatureValid(new String(signature),status,bindingSnapshot,history,chainSnapshot),false);
});
