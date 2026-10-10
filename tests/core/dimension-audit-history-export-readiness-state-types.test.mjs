import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 956: readiness state rejects coerced canonical fields",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:1,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"history",
    provenance_signature:"provenance"
  });
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateValid(state),true);
  for(const [field,value] of [
    ["schema",new String(state.schema)],
    ["code",new String(state.code)],
    ["attempt_count","1"],
    ["ready",1],
    ["history_snapshot_signature",new String(state.history_snapshot_signature)],
    ["provenance_signature",new String(state.provenance_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportReadinessStateValid({...state,[field]:value}),false,field);
  }
});
