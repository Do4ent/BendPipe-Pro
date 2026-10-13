import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1095: history integrity rejects tampered signed snapshot through canonical signature validator",()=>{
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
  const tampered={...snapshot,project_name:"tampered"};
  const integrity=dimensionAuditDownloadHistoryIntegrity(tampered);
  assert.equal(integrity.snapshot_signature_valid,false);
  assert.equal(integrity.valid,false);
});
