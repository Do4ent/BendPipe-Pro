import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1092: history integrity uses canonical summary-signature validation",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:01.000Z",
    attempts:[attempt]
  });
  assert.equal(dimensionAuditDownloadHistoryIntegrity(snapshot).summary_signature_valid,true);
});

test("question 1093: recomputed signature cannot rescue an invalid summary",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAudit.v1",
    code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:01.000Z",
    attempts:[attempt]
  });
  const tamperedSummary={...snapshot.summary,total:2};
  const tampered={
    ...snapshot,
    summary:tamperedSummary,
    summary_signature:JSON.stringify({
      schema:String(tamperedSummary.schema??""),
      total:Number(tamperedSummary.total??0),
      blocked:Number(tamperedSummary.blocked??0),
      downloaded:Number(tamperedSummary.downloaded??0),
      failed:Number(tamperedSummary.failed??0),
      latest_signature:String(tamperedSummary.latest_signature??"")
    })
  };
  const integrity=dimensionAuditDownloadHistoryIntegrity(tampered);
  assert.equal(integrity.summary_valid,false);
  assert.equal(integrity.summary_signature_valid,false);
});
