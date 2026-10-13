import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 959: readiness snapshot rejects coerced canonical fields",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid(snapshot,state),true);
  for(const [field,value] of [
    ["schema",new String(snapshot.schema)],
    ["protocol_signature",new String(snapshot.protocol_signature)],
    ["state_schema",new String(snapshot.state_schema)],
    ["code",new String(snapshot.code)],
    ["attempt_count","0"],
    ["signature",new String(snapshot.signature)],
    ["snapshot_signature",new String(snapshot.snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid({...snapshot,[field]:value},state),false,field);
  }
});
