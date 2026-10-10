import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealth,
  dimensionAuditDownloadHistoryHealthSignature,
  dimensionAuditDownloadHistoryHealthSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1108: history health signature validator accepts canonical health and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const health=dimensionAuditDownloadHistoryHealth(snapshot);
  const signature=dimensionAuditDownloadHistoryHealthSignature(health);
  assert.equal(dimensionAuditDownloadHistoryHealthSignatureValid(signature,health),true);
  assert.equal(dimensionAuditDownloadHistoryHealthSignatureValid("",health),false);
  assert.equal(dimensionAuditDownloadHistoryHealthSignatureValid({toString:()=>signature},health),false);
  assert.equal(dimensionAuditDownloadHistoryHealthSignatureValid(signature,{...health,code:"tampered"}),false);
});
