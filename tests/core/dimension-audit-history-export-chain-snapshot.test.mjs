import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SNAPSHOT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportChainSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 774: history export chain snapshot is self-contained and validated",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain(dimensionAuditDownloadHistoryExportReadinessState());
  const snapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.chain_valid,true);
  assert.equal(snapshot.chain_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotValid({...snapshot,chain_valid:false}),false);
});
