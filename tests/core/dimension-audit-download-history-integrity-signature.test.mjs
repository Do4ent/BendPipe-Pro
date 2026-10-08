import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryIntegritySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 579: audit history integrity diagnostics have deterministic signature",()=>{
  const a={
    schema:"TubeBender.DimensionAuditDownloadHistoryIntegrity.v1",
    valid:false,
    code:"INVALID_ATTEMPTS",
    errors:["INVALID_ATTEMPTS","INVALID_SUMMARY"],
    history_schema_valid:true,
    attempt_count_valid:true,
    attempts_valid:false,
    summary_valid:false,
    summary_signature_valid:true,
    snapshot_signature_valid:true
  };
  const b={...a,generated_at:"2099-01-01T00:00:00Z"};
  assert.equal(dimensionAuditDownloadHistoryIntegritySignature(a),dimensionAuditDownloadHistoryIntegritySignature(b));
  assert.notEqual(
    dimensionAuditDownloadHistoryIntegritySignature(a),
    dimensionAuditDownloadHistoryIntegritySignature({...a,summary_valid:true})
  );
});
