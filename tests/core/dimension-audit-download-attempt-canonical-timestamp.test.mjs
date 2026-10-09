import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 922: audit attempt validator requires canonical UTC ISO generated_at",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"blocked",
    code:"EMPTY",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const tampered={...attempt,generated_at:"2026-10-09T00:00:00Z"};
  tampered.signature=dimensionAuditDownloadAttemptSignature(tampered);
  assert.equal(dimensionAuditDownloadAttemptValid(tampered),false);
});
