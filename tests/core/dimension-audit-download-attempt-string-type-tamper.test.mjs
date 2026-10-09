import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
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
    tampered.signature=dimensionAuditDownloadAttemptSignature(tampered);
    assert.equal(dimensionAuditDownloadAttemptValid(tampered),false,field);
  }
  assert.equal(dimensionAuditDownloadAttemptValid({...attempt,signature:new String(attempt.signature)}),false,"signature");
});
