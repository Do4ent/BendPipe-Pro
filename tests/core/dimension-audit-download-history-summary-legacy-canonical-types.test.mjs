import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
  dimensionAuditDownloadHistorySummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1153: legacy history summary rejects coercible status/signature fields",()=>{
  const summary={
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
    total:1,
    blocked:1,
    downloaded:0,
    failed:0,
    latest_signature:"a1"
  };
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,[{status:"blocked",signature:"a1"}]),true);
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,[{status:{toString:()=>"blocked"},signature:"a1"}]),false);
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,[{status:"blocked",signature:{toString:()=>"a1"}}]),false);
});
