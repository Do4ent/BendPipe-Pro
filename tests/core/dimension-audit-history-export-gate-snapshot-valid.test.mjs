import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportGateSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 741: history export gate snapshot validation fails closed on tampering",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const snapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid({...snapshot,schema:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid({...snapshot,gate:{...gate,allowed:!gate.allowed}}),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid({...snapshot,gate_signature:snapshot.gate_signature+"x"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid({...snapshot,gate_valid:false}),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid({...snapshot,gate_signature_valid:false}),false);
});
