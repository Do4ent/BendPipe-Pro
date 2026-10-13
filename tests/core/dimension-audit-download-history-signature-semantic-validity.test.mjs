import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistorySignature,
  dimensionAuditDownloadHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1239: history signature validator rejects self-signed inconsistent attempt_count",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",filename:"audit.json",snapshot_schema:"TubeBender.DimensionAudit.v1",code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",project_name:"P",generated_at:"2026-10-09T00:00:01.000Z",attempts:[attempt]
  });
  const impossible={...snapshot,attempt_count:2};
  const forged=dimensionAuditDownloadHistorySignature(impossible);
  assert.equal(dimensionAuditDownloadHistorySignatureValid(forged,impossible),false);
});
