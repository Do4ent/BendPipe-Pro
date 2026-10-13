import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 970-971: authorization snapshot rejects coerced fields and signature",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportChain(dimensionAuditDownloadHistoryExportReadinessState()).authorization_snapshot;
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(snapshot),true);
  for(const [field,value] of [
    ["schema",new String(snapshot.schema)],
    ["authorization_signature",new String(snapshot.authorization_signature)],
    ["authorization_valid",1],
    ["snapshot_signature",new String(snapshot.snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid({...snapshot,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(new String(signature),snapshot),false);
});
