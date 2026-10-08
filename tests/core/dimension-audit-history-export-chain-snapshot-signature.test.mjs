import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportChainSnapshotSignature,
  dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportChainSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 775: history export chain snapshot has its own deterministic signature",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain(dimensionAuditDownloadHistoryExportReadinessState());
  const snapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportChainSnapshotSignature(snapshot));
  assert.equal(snapshot.snapshot_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotValid({...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"}),false);
});
