import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

function signed(status,error){
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
    status,
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    preflight_signature:"preflight",
    runtime_signature:"runtime",
    protocol_signature:"protocol",
    error,
    generated_at:"2099-01-01T00:00:00.000Z"
  };
  return {...base,signature:dimensionAuditDownloadAttemptSignature(base)};
}

test("question 597: signed audit attempt validity enforces outcome/error semantics",()=>{
  assert.equal(dimensionAuditDownloadAttemptValid(signed("downloaded",null)),true);
  assert.equal(dimensionAuditDownloadAttemptValid(signed("blocked",null)),true);
  assert.equal(dimensionAuditDownloadAttemptValid(signed("failed","disk full")),true);
  assert.equal(dimensionAuditDownloadAttemptValid(signed("failed",null)),false);
  assert.equal(dimensionAuditDownloadAttemptValid(signed("downloaded","unexpected")),false);
});
