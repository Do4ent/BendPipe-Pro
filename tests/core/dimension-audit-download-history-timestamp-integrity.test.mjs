import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptValid,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity
} from "../../src/domain/measurements/audit-download.mjs";

test("question 668: audit attempt and history timestamps are integrity protected",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    generated_at:"2026-10-08T10:00:00.000Z"
  });
  assert.equal(dimensionAuditDownloadAttemptValid(attempt),true);
  assert.equal(
    dimensionAuditDownloadAttemptValid({...attempt,generated_at:"2026-10-08T10:00:01.000Z"}),
    false
  );

  const history=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    generated_at:"2026-10-08T10:00:00.000Z",
    attempts:[attempt]
  });
  assert.equal(dimensionAuditDownloadHistoryIntegrity(history).valid,true);
  assert.equal(
    dimensionAuditDownloadHistoryIntegrity({...history,generated_at:"2026-10-08T10:00:01.000Z"}).valid,
    false
  );
});
