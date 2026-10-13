import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportChainSnapshotSignature,
  dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1252: chain snapshot signature validator binds validity flags to nested chain",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain();
  const snapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);
  const impossible={...snapshot,chain_valid:!snapshot.chain_valid};
  const forged=dimensionAuditDownloadHistoryExportChainSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(forged,impossible),false);
});
