import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptSignatureValid,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 921: audit attempt rejects string-coercible non-string fields",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"blocked",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"EMPTY",
    preflight_signature:"p",
    runtime_signature:"r",
    protocol_signature:"q",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  for(const field of ["schema","status","filename","code","preflight_signature","runtime_signature","protocol_signature","generated_at"]){
    const tampered={...attempt,[field]:new String(attempt[field])};
    assert.throws(
      ()=>dimensionAuditDownloadAttemptSignature(tampered),
      {name:"TypeError",message:"audit download attempt signature fields must be canonical"},
      field
    );
  }
  assert.equal(dimensionAuditDownloadAttemptValid({...attempt,signature:new String(attempt.signature)}),false,"signature");
});

test("question 1179: attempt signature validator remains fail-closed when a coercible field bypasses the strict builder",()=>{
  const malformed={
    schema:"TubeBender.DimensionAuditDownloadAttempt.v1",
    status:"blocked",
    filename:new String("audit.json"),
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"EMPTY",
    preflight_signature:"p",
    runtime_signature:"r",
    protocol_signature:"q",
    error:null,
    generated_at:"2026-10-09T00:00:00.000Z"
  };
  assert.equal(dimensionAuditDownloadAttemptSignatureValid("forged",malformed),false);
});
