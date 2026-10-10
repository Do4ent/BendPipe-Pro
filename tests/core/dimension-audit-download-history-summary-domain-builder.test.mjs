import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
  dimensionAuditDownloadHistorySummary
} from "../../src/domain/measurements/audit-download.mjs";

test("question 589: audit download history summary is built canonically in domain",()=>{
  const attempts=[
    {status:"blocked",signature:"a1"},
    {status:"downloaded",signature:"a2"},
    {status:"failed",signature:"a3"}
  ];
  const summary=dimensionAuditDownloadHistorySummary(attempts);
  assert.equal(summary.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA);
  assert.deepEqual(summary,{
    schema:DIMENSION_AUDIT_DOWNLOAD_HISTORY_SUMMARY_SCHEMA,
    total:3,blocked:1,downloaded:1,failed:1,latest_signature:"a3"
  });
  assert.equal(Object.isFrozen(summary),true);
  assert.throws(()=>dimensionAuditDownloadHistorySummary(null),/attempts must be an array/);
  assert.throws(()=>dimensionAuditDownloadHistorySummary([{status:"unknown"}]),/unsupported audit download attempt status/);
});
