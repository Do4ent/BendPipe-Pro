import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeSignature,
  dimensionAuditDownloadHistoryEnvelopeSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1241: envelope signature validator rejects self-signed contradictory validity flags",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",filename:"audit.json",snapshot_schema:"TubeBender.DimensionAudit.v1",code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",project_name:"P",generated_at:"2026-10-09T00:00:01.000Z",attempts:[attempt]
  });
  const impossible={...snapshot,attempts_valid:false};
  const forged=dimensionAuditDownloadHistoryEnvelopeSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid(forged,impossible),false);
});
