import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 712: history export readiness snapshot fails closed on tampering",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"history",
    provenance_signature:"provenance"
  });
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid(snapshot,state),true);

  const mutations=[
    {schema:"bad"},
    {state_schema:"bad"},
    {state_valid:false},
    {ready:false},
    {code:"UNTRUSTED"},
    {attempt_count:3},
    {verification_valid:false},
    {trusted:false},
    {provenance_valid:false},
    {history_snapshot_signature:"tampered"},
    {provenance_signature:"tampered"},
    {signature:"tampered"},
    {signature_valid:false}
  ];
  for(const mutation of mutations){
    assert.equal(
      dimensionAuditDownloadHistoryExportReadinessSnapshotValid({...snapshot,...mutation},state),
      false,
      JSON.stringify(mutation)
    );
  }
});
