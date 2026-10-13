import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SNAPSHOT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 740: history export gate snapshot is self-contained and signed",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const snapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_GATE_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.gate.code,gate.code);
  assert.equal(snapshot.gate_valid,true);
  assert.equal(snapshot.gate_signature_valid,true);
  assert.ok(snapshot.gate_signature.length>0);
  assert.equal(Object.isFrozen(snapshot),true);
});
