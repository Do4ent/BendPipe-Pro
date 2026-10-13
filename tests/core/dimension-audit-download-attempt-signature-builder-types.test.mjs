import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1177: attempt signature builder rejects coercible fields",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  assert.doesNotThrow(()=>dimensionAuditDownloadAttemptSignature(attempt));
  assert.throws(
    ()=>dimensionAuditDownloadAttemptSignature({
      ...attempt,
      filename:{toString:()=>attempt.filename}
    }),
    {name:"TypeError",message:"audit download attempt signature fields must be canonical"}
  );
});
