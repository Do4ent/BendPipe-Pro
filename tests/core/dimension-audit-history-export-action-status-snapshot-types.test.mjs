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
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotValid,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid
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
  const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);
  return {history,chainSnapshot,bindingSnapshot,status};
}

test("questions 982-983: action status snapshot rejects coerced fields and signature",()=>{
  const {history,chainSnapshot,bindingSnapshot,status}=fixture();
  const snapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotValid(snapshot,bindingSnapshot,history,chainSnapshot),true);
  for(const [field,value] of [
    ["schema",new String(snapshot.schema)],
    ["status_signature",new String(snapshot.status_signature)],
    ["status_valid",1],
    ["snapshot_signature",new String(snapshot.snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotValid({...snapshot,[field]:value},bindingSnapshot,history,chainSnapshot),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(new String(signature),snapshot),false);
});
