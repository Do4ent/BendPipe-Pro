import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySummary,
  dimensionAuditDownloadHistorySummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 925: attempt-history summary rejects coerced field types",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"blocked",
    code:"EMPTY",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistorySummary([attempt]);
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,[attempt]),true);
  assert.equal(dimensionAuditDownloadHistorySummaryValid({...summary,total:"1"},[attempt]),false);
  assert.equal(dimensionAuditDownloadHistorySummaryValid({...summary,latest_signature:new String(summary.latest_signature)},[attempt]),false);
});
