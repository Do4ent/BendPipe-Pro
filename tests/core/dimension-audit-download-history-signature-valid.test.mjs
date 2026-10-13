import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistorySignature,
  dimensionAuditDownloadHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1094: history snapshot signature validator accepts canonical signature and fails closed on malformed input",()=>{
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
  const signature=dimensionAuditDownloadHistorySignature(snapshot);
  assert.equal(dimensionAuditDownloadHistorySignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistorySignatureValid("",snapshot),false);
  assert.equal(dimensionAuditDownloadHistorySignatureValid({toString:()=>signature},snapshot),false);
  assert.equal(dimensionAuditDownloadHistorySignatureValid(signature,{...snapshot,project_name:"tampered"}),false);
});
