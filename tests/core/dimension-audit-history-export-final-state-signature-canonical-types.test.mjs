import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportFinalStateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1210: final-state signature builder rejects coercible non-canonical fields",()=>{
  const state={
    schema:"s",
    action:"copy",
    ready:true,
    code:"READY",
    action_valid:true,
    permit_snapshot_valid:true,
    permit_ready:true,
    permit_snapshot_signature:"p"
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportFinalStateSignature(state));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportFinalStateSignature({...state,action:{toString:()=>"copy"}}),
    {name:"TypeError",message:"history export final state signature fields must be canonical"}
  );
});
