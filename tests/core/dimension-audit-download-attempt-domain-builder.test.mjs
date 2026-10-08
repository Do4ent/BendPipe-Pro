import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 593: domain builds canonical signed audit download attempts",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    preflight_signature:"preflight",
    runtime_signature:"runtime",
    protocol_signature:"protocol",
    generated_at:"2099-01-01T00:00:00Z"
  });
  assert.equal(attempt.schema,DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA);
  assert.equal(attempt.status,"downloaded");
  assert.ok(attempt.signature);
  assert.equal(attempt.generated_at,"2099-01-01T00:00:00Z");
  assert.equal(dimensionAuditDownloadAttemptValid(attempt),true);
  assert.equal(Object.isFrozen(attempt),true);
  assert.throws(()=>buildDimensionAuditDownloadAttempt({status:"unknown"}),/unsupported audit download attempt status/);
});
