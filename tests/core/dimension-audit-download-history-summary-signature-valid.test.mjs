import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySummary,
  dimensionAuditDownloadHistorySummarySignature,
  dimensionAuditDownloadHistorySummarySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1090: history summary signature validator accepts a canonical signed summary",()=>{
  const attempts=[
    buildDimensionAuditDownloadAttempt({
      status:"downloaded",
      filename:"audit.json",
      snapshot_schema:"TubeBender.DimensionAudit.v1",
      code:"OK",
      generated_at:"2026-10-09T00:00:00.000Z"
    })
  ];
  const summary=dimensionAuditDownloadHistorySummary(attempts);
  const signature=dimensionAuditDownloadHistorySummarySignature(summary);
  assert.equal(dimensionAuditDownloadHistorySummarySignatureValid(signature,summary,attempts),true);
});

test("question 1091: history summary signature validator fails closed on malformed signature or attempts",()=>{
  const attempts=[
    buildDimensionAuditDownloadAttempt({
      status:"downloaded",
      filename:"audit.json",
      snapshot_schema:"TubeBender.DimensionAudit.v1",
      code:"OK",
      generated_at:"2026-10-09T00:00:00.000Z"
    })
  ];
  const summary=dimensionAuditDownloadHistorySummary(attempts);
  const signature=dimensionAuditDownloadHistorySummarySignature(summary);
  assert.equal(dimensionAuditDownloadHistorySummarySignatureValid({toString:()=>signature},summary,attempts),false);
  assert.equal(dimensionAuditDownloadHistorySummarySignatureValid(signature,summary,null),false);
  assert.equal(dimensionAuditDownloadHistorySummarySignatureValid(signature,{...summary,total:2},attempts),false);
});
