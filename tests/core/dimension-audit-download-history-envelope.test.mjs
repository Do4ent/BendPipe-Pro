import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadHistorySummarySignature,
  dimensionAuditDownloadHistorySignature,
  dimensionAuditDownloadHistoryIntegrity,
  dimensionAuditDownloadHistoryIntegritySignature,
  dimensionAuditDownloadHistoryEnvelopeSignature,
  dimensionAuditDownloadHistoryEnvelopeValid
} from "../../src/domain/measurements/audit-download.mjs";

function attempt(status,filename){
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
    status,
    filename,
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    preflight_signature:"preflight",
    runtime_signature:"runtime",
    protocol_signature:"protocol",
    error:null
  };
  return {...base,signature:dimensionAuditDownloadAttemptSignature(base)};
}
function snapshot(){
  const attempts=[attempt("downloaded","a.json")];
  const summary={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
    total:1,blocked:0,downloaded:1,failed:0,
    latest_signature:attempts[0].signature
  };
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
    project_id:"p1",
    project_name:"Project",
    summary,
    summary_signature:dimensionAuditDownloadHistorySummarySignature(summary),
    attempt_count:1,
    attempts
  };
  const signed={...base,snapshot_signature:dimensionAuditDownloadHistorySignature(base)};
  const integrity=dimensionAuditDownloadHistoryIntegrity(signed);
  const full={
    ...signed,
    attempts_valid:integrity.attempts_valid,
    summary_valid:integrity.summary_valid,
    integrity,
    integrity_signature:dimensionAuditDownloadHistoryIntegritySignature(integrity),
    valid:integrity.valid
  };
  return {...full,envelope_signature:dimensionAuditDownloadHistoryEnvelopeSignature(full)};
}

test("question 583: audit download history envelope detects metadata tampering",()=>{
  const value=snapshot();
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid(value),true);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...value,summary_valid:false}),false);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...value,integrity_signature:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...value,envelope_signature:"bad"}),false);
});

test("question 584: audit download history envelope signature is deterministic",()=>{
  const value=snapshot();
  assert.equal(
    dimensionAuditDownloadHistoryEnvelopeSignature(value),
    dimensionAuditDownloadHistoryEnvelopeSignature({...value,generated_at:"2099-01-01T00:00:00Z"})
  );
});
