import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 726: readiness snapshot has deterministic full snapshot signature",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(
    dimensionAuditDownloadHistoryExportReadinessState()
  );
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(snapshot));
  assert.equal(snapshot.snapshot_signature_valid,true);
  const same=dimensionAuditDownloadHistoryExportReadinessSnapshot(
    dimensionAuditDownloadHistoryExportReadinessState()
  );
  assert.equal(snapshot.snapshot_signature,same.snapshot_signature);
});
