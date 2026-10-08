import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
  dimensionAuditDownloadHistorySummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 565: audit download history summary is validated against attempts",()=>{
  const attempts=[
    {status:"blocked",signature:"a1"},
    {status:"downloaded",signature:"a2"},
    {status:"failed",signature:"a3"}
  ];
  const summary={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
    total:3,
    blocked:1,
    downloaded:1,
    failed:1,
    latest_signature:"a3"
  };
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,attempts),true);
  assert.equal(dimensionAuditDownloadHistorySummaryValid({...summary,total:2},attempts),false);
  assert.equal(dimensionAuditDownloadHistorySummaryValid({...summary,blocked:2},attempts),false);
  assert.equal(dimensionAuditDownloadHistorySummaryValid({...summary,latest_signature:"a2"},attempts),false);
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,[...attempts,{status:"unknown",signature:"x"}]),false);
});
