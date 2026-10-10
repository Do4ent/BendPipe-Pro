import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity,
  dimensionAuditDownloadHistoryIntegritySignature,
  dimensionAuditDownloadHistoryIntegritySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1240: integrity signature validator rejects self-signed contradictory validity state",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",filename:"audit.json",snapshot_schema:"TubeBender.DimensionAudit.v1",code:"OK",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",project_name:"P",generated_at:"2026-10-09T00:00:01.000Z",attempts:[attempt]
  });
  const integrity=dimensionAuditDownloadHistoryIntegrity(snapshot);
  const impossible={...integrity,attempts_valid:false,valid:true,code:"OK",errors:[]};
  const forged=dimensionAuditDownloadHistoryIntegritySignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryIntegritySignatureValid(forged,impossible),false);
});
