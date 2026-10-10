import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySummary,
  dimensionAuditDownloadHistorySummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

function fixture(){
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const attempts=[attempt];
  const summary=dimensionAuditDownloadHistorySummary(attempts);
  return {attempts,summary};
}

test("question 1086: history summary rejects attempt content tampered behind stale signature",()=>{
  const {attempts,summary}=fixture();
  const tampered=[{...attempts[0],filename:"tampered.json"}];
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,tampered),false);
});

test("question 1087: history summary rejects code tamper even when status counts and latest signature are unchanged",()=>{
  const {attempts,summary}=fixture();
  const tampered=[{...attempts[0],code:"TAMPERED"}];
  assert.equal(dimensionAuditDownloadHistorySummaryValid(summary,tampered),false);
});
