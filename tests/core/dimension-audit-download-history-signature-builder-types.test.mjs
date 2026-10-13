import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1170: history snapshot signature builder rejects coercible fields",()=>{
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
  assert.doesNotThrow(()=>dimensionAuditDownloadHistorySignature(snapshot));
  assert.throws(
    ()=>dimensionAuditDownloadHistorySignature({...snapshot,attempt_count:"1"}),
    {name:"TypeError",message:"audit download history signature fields must be canonical"}
  );
});
