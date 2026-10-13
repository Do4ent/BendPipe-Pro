import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 674: canonical history builder normalizes and validates generated_at",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    generated_at:"2026-10-08T10:00:00Z",
    attempts:[]
  });
  assert.equal(snapshot.generated_at,"2026-10-08T10:00:00.000Z");
  assert.throws(
    ()=>dimensionAuditDownloadHistorySnapshot({
      project_id:"p1",
      generated_at:"not-a-date",
      attempts:[]
    }),
    /audit download history generated_at must be a valid timestamp/
  );
});
