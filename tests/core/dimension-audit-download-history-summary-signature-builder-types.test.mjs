import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySummary,
  dimensionAuditDownloadHistorySummarySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1169: history summary signature builder rejects coercible fields",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistorySummary([attempt]);
  assert.doesNotThrow(()=>dimensionAuditDownloadHistorySummarySignature(summary));
  assert.throws(
    ()=>dimensionAuditDownloadHistorySummarySignature({...summary,total:"1"}),
    {name:"TypeError",message:"audit download history summary signature fields must be canonical"}
  );
});
