import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 570: audit download attempts are individually signature-validated",()=>{
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    preflight_signature:"preflight",
    runtime_signature:"runtime",
    protocol_signature:"protocol",
    error:null,
    generated_at:"2099-01-01T00:00:00Z"
  };
  const attempt={...base,signature:dimensionAuditDownloadAttemptSignature(base)};
  assert.equal(dimensionAuditDownloadAttemptValid(attempt),true);
  assert.equal(dimensionAuditDownloadAttemptValid({...attempt,filename:"tampered.json"}),false);
  assert.equal(dimensionAuditDownloadAttemptValid({...attempt,generated_at:"2099-01-01T00:00:01Z"}),false);
  assert.equal(dimensionAuditDownloadAttemptValid({...attempt,status:"unknown"}),false);
  assert.equal(dimensionAuditDownloadAttemptValid({...attempt,signature:""}),false);
});
