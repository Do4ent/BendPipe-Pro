import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryIntegritySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 579: audit history integrity diagnostics have deterministic signature",()=>{
  const a={
    schema:"TubeBender.DimensionAuditDownloadHistoryIntegrity.v1",
    valid:false,
    code:"INVALID_ATTEMPTS",
    errors:["INVALID_ATTEMPTS","INVALID_SUMMARY"],
    history_schema_valid:true,
    generated_at_valid:true,
    attempt_count_valid:true,
    attempts_valid:false,
    summary_valid:false,
    summary_signature_valid:true,
    protocol_state_valid:true,
    protocol_state_signature_valid:true,
    snapshot_signature_valid:true
  };
  const b={...a,generated_at:"2099-01-01T00:00:00Z"};
  assert.equal(dimensionAuditDownloadHistoryIntegritySignature(a),dimensionAuditDownloadHistoryIntegritySignature(b));
  assert.notEqual(
    dimensionAuditDownloadHistoryIntegritySignature(a),
    dimensionAuditDownloadHistoryIntegritySignature({...a,summary_valid:true})
  );
});

test("question 1190: deterministic integrity signature requires canonical signed diagnostics",()=>{
  const canonical={
    schema:"TubeBender.DimensionAuditDownloadHistoryIntegrity.v1",
    valid:true,
    code:"OK",
    errors:[],
    history_schema_valid:true,
    generated_at_valid:true,
    attempt_count_valid:true,
    attempts_valid:true,
    summary_valid:true,
    summary_signature_valid:true,
    protocol_state_valid:true,
    protocol_state_signature_valid:true,
    snapshot_signature_valid:true
  };
  assert.throws(
    ()=>dimensionAuditDownloadHistoryIntegritySignature({...canonical,generated_at_valid:1}),
    {name:"TypeError",message:"audit download history integrity signature fields must be canonical"}
  );
});
