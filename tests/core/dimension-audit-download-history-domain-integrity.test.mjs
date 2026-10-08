import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadHistorySummarySignature,
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateSignature,
  dimensionAuditDownloadHistorySignature,
  dimensionAuditDownloadHistoryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 558: audit download history integrity is validated by pure domain helpers",()=>{
  const summary={
    schema:"TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1",
    total:2,blocked:1,downloaded:1,failed:0,latest_signature:"attempt-2"
  };
    const attemptBase=(status,filename)=>({
    schema:DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
    status,
    filename,
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    preflight_signature:"preflight",
    runtime_signature:"runtime",
    protocol_signature:"protocol",
    error:null
  });
  const a1=attemptBase("blocked","a1.json");
  const a2=attemptBase("downloaded","a2.json");
  const attempts=[
    {...a1,signature:dimensionAuditDownloadAttemptSignature(a1)},
    {...a2,signature:dimensionAuditDownloadAttemptSignature(a2)}
  ];
  summary.latest_signature=attempts[1].signature;
  const normalizedSummarySignature=dimensionAuditDownloadHistorySummarySignature(summary);
  const protocolState=dimensionAuditDownloadHistoryProtocolState();
  const snapshot={
    schema:"TubeBender.DimensionAuditDownloadHistory.v1",
    project_id:"p1",
    project_name:"Project",
    summary,
    summary_signature:normalizedSummarySignature,
    protocol_state:protocolState,
    protocol_state_signature:dimensionAuditDownloadHistoryProtocolStateSignature(protocolState),
    attempt_count:2,
    attempts
  };
  assert.equal(dimensionAuditDownloadHistoryValid(snapshot),true);
  assert.equal(
    dimensionAuditDownloadHistorySignature(snapshot),
    dimensionAuditDownloadHistorySignature({...snapshot,generated_at:"2099-01-01T00:00:00Z"})
  );
  assert.equal(dimensionAuditDownloadHistoryValid({...snapshot,attempt_count:1}),false);
  assert.equal(dimensionAuditDownloadHistoryValid({...snapshot,summary_signature:"bad"}),false);
  const signed={...snapshot,snapshot_signature:dimensionAuditDownloadHistorySignature(snapshot)};
  assert.equal(dimensionAuditDownloadHistoryValid(signed),true);
  assert.equal(dimensionAuditDownloadHistoryValid({...signed,snapshot_signature:"bad"}),false);
});
