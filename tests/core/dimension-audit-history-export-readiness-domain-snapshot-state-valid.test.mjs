import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 708: readiness snapshot embeds state validity",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:1,
    verification_valid:true,
    trusted:true,
    provenance_valid:true
  });
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  assert.equal(snapshot.state_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid(snapshot,state),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid({...snapshot,state_valid:false},state),false);
});
