import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadHistorySummarySignature,
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateSignature,
  dimensionAuditDownloadHistoryProtocolBindingValid,
  dimensionAuditDownloadHistoryProtocolBinding,
  dimensionAuditDownloadHistoryProtocolBindingSignature,
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
    error:null,
    generated_at:"2099-01-01T00:00:00Z"
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
  const protocolState=dimensionAuditDownloadHistoryProtocolState();
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
    project_id:"p1",
    project_name:"Project",
    generated_at:"2099-01-01T00:00:00Z",
    summary,
    summary_signature:dimensionAuditDownloadHistorySummarySignature(summary),
    protocol_state:protocolState,
    protocol_state_signature:dimensionAuditDownloadHistoryProtocolStateSignature(protocolState),
    attempt_count:1,
    attempts
  };
  const signed={...base,snapshot_signature:dimensionAuditDownloadHistorySignature(base)};
  const integrity=dimensionAuditDownloadHistoryIntegrity(signed);
  const protocolBinding=dimensionAuditDownloadHistoryProtocolBinding(signed);
  const full={
    ...signed,
    attempts_valid:integrity.attempts_valid,
    summary_valid:integrity.summary_valid,
    protocol_binding:protocolBinding,
    protocol_binding_signature:dimensionAuditDownloadHistoryProtocolBindingSignature(protocolBinding),
    protocol_binding_valid:dimensionAuditDownloadHistoryProtocolBindingValid(signed),
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
    dimensionAuditDownloadHistoryEnvelopeSignature({...value,generated_at:"2099-01-01T00:00:01Z"})
  );
  assert.equal(
    dimensionAuditDownloadHistoryEnvelopeValid({...value,generated_at:"2099-01-01T00:00:01Z"}),
    false
  );
});
