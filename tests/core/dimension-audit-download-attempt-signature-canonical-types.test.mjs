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
  const forgedSignature=dimensionAuditDownloadAttemptSignature(malformed);
  assert.equal(dimensionAuditDownloadAttemptSignatureValid(forgedSignature,malformed),false);
});
