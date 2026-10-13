import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1122: download attempt signature validator accepts canonical attempt and rejects malformed/tampered input",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const signature=dimensionAuditDownloadAttemptSignature(attempt);
  assert.equal(dimensionAuditDownloadAttemptSignatureValid(signature,attempt),true);
  assert.equal(dimensionAuditDownloadAttemptSignatureValid("",attempt),false);
  assert.equal(dimensionAuditDownloadAttemptSignatureValid({toString:()=>signature},attempt),false);
  assert.equal(dimensionAuditDownloadAttemptSignatureValid(signature,{...attempt,filename:"tampered.json"}),false);
});
