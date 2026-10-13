import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1235: attempt signature validator rejects self-signed semantically impossible attempts",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const impossible={...attempt,status:"impossible"};
  const forged=dimensionAuditDownloadAttemptSignature(impossible);
  assert.equal(dimensionAuditDownloadAttemptSignatureValid(forged,impossible),false);
});
