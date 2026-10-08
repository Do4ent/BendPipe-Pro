import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_ATTEMPT_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_SCHEMA,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadHistorySummarySignature,
  dimensionAuditDownloadHistorySignature,
  dimensionAuditDownloadHistoryIntegrity
} from "../../src/domain/measurements/audit-download.mjs";

function signedAttempt(status,filename){
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

function validSnapshot(){
  const attempts=[signedAttempt("blocked","a.json"),signedAttempt("downloaded","b.json")];
  const summary={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
    total:2,blocked:1,downloaded:1,failed:0,
    latest_signature:attempts.at(-1).signature
  };
  const base={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SCHEMA,
    project_id:"p1",
    project_name:"Project",
    summary,
    summary_signature:dimensionAuditDownloadHistorySummarySignature(summary),
    attempt_count:attempts.length,
    attempts
  };
  return {...base,snapshot_signature:dimensionAuditDownloadHistorySignature(base)};
}

test("question 575: audit download history integrity returns diagnostic codes",()=>{
  const good=dimensionAuditDownloadHistoryIntegrity(validSnapshot());
  assert.equal(good.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_INTEGRITY_SCHEMA);
  assert.equal(good.valid,true);
  assert.equal(good.code,"OK");
  assert.deepEqual(good.errors,[]);

  const badCount=dimensionAuditDownloadHistoryIntegrity({...validSnapshot(),attempt_count:99});
  assert.equal(badCount.valid,false);
  assert.equal(badCount.code,"INVALID_ATTEMPT_COUNT");
  assert.ok(badCount.errors.includes("INVALID_ATTEMPT_COUNT"));

  const badAttempt=validSnapshot();
  badAttempt.attempts[0]={...badAttempt.attempts[0],filename:"tampered.json"};
  const attemptIntegrity=dimensionAuditDownloadHistoryIntegrity(badAttempt);
  assert.ok(attemptIntegrity.errors.includes("INVALID_ATTEMPTS"));

  const badSignature=dimensionAuditDownloadHistoryIntegrity({...validSnapshot(),snapshot_signature:"bad"});
  assert.ok(badSignature.errors.includes("INVALID_SNAPSHOT_SIGNATURE"));
});
