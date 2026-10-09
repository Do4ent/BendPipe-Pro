import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1123: attempt validation rejects stale signature after signed-field tamper",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  assert.equal(dimensionAuditDownloadAttemptValid(attempt),true);
  assert.equal(dimensionAuditDownloadAttemptValid({...attempt,code:"tampered"}),false);
});
