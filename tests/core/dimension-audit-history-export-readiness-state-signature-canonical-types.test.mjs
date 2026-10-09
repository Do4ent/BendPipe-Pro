import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessStateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1216: readiness-state signature builder rejects coercible non-canonical fields",()=>{
  const state={
    schema:"s",
    ready:true,
    code:"READY",
    attempt_count:1,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"h",
    provenance_signature:"p"
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportReadinessStateSignature(state));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportReadinessStateSignature({...state,attempt_count:"1"}),
    {name:"TypeError",message:"history export readiness state signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportReadinessStateSignature({...state,trusted:1}),
    {name:"TypeError",message:"history export readiness state signature fields must be canonical"}
  );
});
