import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySummary,
  dimensionAuditDownloadHistorySummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1088: history summary keeps legacy aggregate-only fixtures compatible",()=>{
  const attempts=[
    {status:"blocked",signature:"a1"},
    {status:"downloaded",signature:"a2"}
  ];
  const summary={
    schema:"TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1",
    total:2,
    blocked:1,
    downloaded:1,
    failed:0,
    latest_signature:"a2"
  };
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,attempts),true);
});

test("question 1089: mixed legacy and signed attempts fail closed",()=>{
  const signed=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const attempts=[{status:"blocked",signature:"legacy"},signed];
  const summary=dimensionAuditDownloadHistorySummary(attempts);
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,attempts),false);
});
