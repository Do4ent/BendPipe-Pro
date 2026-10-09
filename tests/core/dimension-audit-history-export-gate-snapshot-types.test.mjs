import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportGateSnapshotValid,
  dimensionAuditDownloadHistoryExportGateSnapshotSignature,
  dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 962-963: gate snapshot rejects coerced fields and signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const snapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid(snapshot),true);
  for(const [field,value] of [
    ["schema",new String(snapshot.schema)],
    ["gate_signature",new String(snapshot.gate_signature)],
    ["gate_valid",1],
    ["snapshot_signature",new String(snapshot.snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid({...snapshot,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportGateSnapshotSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(new String(signature),snapshot),false);
});
