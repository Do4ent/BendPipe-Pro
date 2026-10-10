import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1136: attempt signature validation rejects coercible non-canonical signed fields",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const malformed={...attempt,filename:{toString:()=>attempt.filename}};
  assert.throws(
    ()=>dimensionAuditDownloadAttemptSignature(malformed),
    {name:"TypeError",message:"audit download attempt signature fields must be canonical"}
  );
});

test("question 1178: attempt signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={
    schema:"TubeBender.DimensionAuditDownloadAttempt.v1",
    status:"downloaded",
    filename:{toString:()=>"audit.json"},
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    preflight_signature:"",
    runtime_signature:"",
    protocol_signature:"",
    error:null,
    generated_at:"2026-10-09T00:00:00.000Z"
  };
  assert.equal(
    dimensionAuditDownloadAttemptSignatureValid("forged",malformed),
    false
  );
});
