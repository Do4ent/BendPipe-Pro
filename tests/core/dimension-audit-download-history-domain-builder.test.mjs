import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

function attempt(){
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
  return {...base,signature:dimensionAuditDownloadAttemptSignature(base)};
}

test("question 591: domain builds canonical signed and enveloped audit history snapshot",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    generated_at:"2099-01-01T00:00:00Z",
    attempts:[attempt()]
  });
  assert.equal(snapshot.schema,"TubeBender.DimensionAuditDownloadHistory.v1");
  assert.equal(snapshot.attempt_count,1);
  assert.equal(snapshot.summary.total,1);
  assert.equal(snapshot.attempts_valid,true);
  assert.equal(snapshot.summary_valid,true);
  assert.equal(snapshot.integrity.valid,true);
  assert.equal(snapshot.valid,true);
  assert.equal(snapshot.envelope_valid,true);
  assert.ok(snapshot.snapshot_signature);
  assert.ok(snapshot.integrity_signature);
  assert.ok(snapshot.envelope_signature);
  assert.equal(Object.isFrozen(snapshot),true);
});
