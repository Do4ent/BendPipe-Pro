import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportChainSnapshotValid,
  dimensionAuditDownloadHistoryExportChainSnapshotSignature,
  dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 974-975: chain snapshot rejects coerced fields and signature",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain(dimensionAuditDownloadHistoryExportReadinessState());
  const snapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotValid(snapshot),true);
  for(const [field,value] of [
    ["schema",new String(snapshot.schema)],
    ["chain_signature",new String(snapshot.chain_signature)],
    ["chain_valid",1],
    ["snapshot_signature",new String(snapshot.snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotValid({...snapshot,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportChainSnapshotSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(new String(signature),snapshot),false);
});
