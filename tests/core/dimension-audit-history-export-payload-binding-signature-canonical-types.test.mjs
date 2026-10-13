import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportPayloadBindingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1211: payload-binding signature builder rejects coercible non-canonical fields",()=>{
  const binding={
    schema:"s",
    history_snapshot_signature:"h",
    chain_snapshot_signature:"c",
    attempt_count:1,
    chain_attempt_count:1,
    allowed:true,
    code:"READY",
    history_signature_matches_chain:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportPayloadBindingSignature(binding));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportPayloadBindingSignature({...binding,attempt_count:"1"}),
    {name:"TypeError",message:"history export payload binding signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportPayloadBindingSignature({...binding,allowed:1}),
    {name:"TypeError",message:"history export payload binding signature fields must be canonical"}
  );
});
