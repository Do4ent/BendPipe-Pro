import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 978-979: payload binding snapshot rejects coerced fields and signature",()=>{
  const history=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:history.attempt_count,
    history_snapshot_signature:history.snapshot_signature
  });
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(dimensionAuditDownloadHistoryExportChain(state));
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid(snapshot,history,chainSnapshot),true);
  for(const [field,value] of [
    ["schema",new String(snapshot.schema)],
    ["binding_signature",new String(snapshot.binding_signature)],
    ["binding_valid",1],
    ["snapshot_signature",new String(snapshot.snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid({...snapshot,[field]:value},history,chainSnapshot),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(new String(signature),snapshot),false);
});
