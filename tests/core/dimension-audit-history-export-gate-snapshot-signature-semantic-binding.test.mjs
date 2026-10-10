import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportGateSnapshotSignature,
  dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1246: gate snapshot signature validator binds validity flags to nested gate",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:0,verification_valid:false,trusted:false,provenance_valid:false,
    history_snapshot_signature:"h",provenance_signature:"p"
  });
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const snapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const impossible={...snapshot,gate_valid:!snapshot.gate_valid};
  const forged=dimensionAuditDownloadHistoryExportGateSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(forged,impossible),false);
});
