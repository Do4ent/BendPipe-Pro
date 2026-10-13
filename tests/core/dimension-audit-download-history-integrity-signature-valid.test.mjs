import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity,
  dimensionAuditDownloadHistoryIntegritySignature,
  dimensionAuditDownloadHistoryIntegritySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1104: integrity signature validator accepts canonical diagnostics and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const integrity=dimensionAuditDownloadHistoryIntegrity(snapshot);
  const signature=dimensionAuditDownloadHistoryIntegritySignature(integrity);
  assert.equal(dimensionAuditDownloadHistoryIntegritySignatureValid(signature,integrity),true);
  assert.equal(dimensionAuditDownloadHistoryIntegritySignatureValid("",integrity),false);
  assert.equal(dimensionAuditDownloadHistoryIntegritySignatureValid({toString:()=>signature},integrity),false);
  assert.equal(dimensionAuditDownloadHistoryIntegritySignatureValid(signature,{...integrity,code:"tampered"}),false);
});
