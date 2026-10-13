import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryVerification,
  dimensionAuditDownloadHistoryVerificationSignature,
  dimensionAuditDownloadHistoryVerificationSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1112: verification signature validator accepts canonical verification and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const verification=dimensionAuditDownloadHistoryVerification(snapshot);
  const signature=dimensionAuditDownloadHistoryVerificationSignature(verification);
  assert.equal(dimensionAuditDownloadHistoryVerificationSignatureValid(signature,verification),true);
  assert.equal(dimensionAuditDownloadHistoryVerificationSignatureValid("",verification),false);
  assert.equal(dimensionAuditDownloadHistoryVerificationSignatureValid({toString:()=>signature},verification),false);
  assert.equal(dimensionAuditDownloadHistoryVerificationSignatureValid(signature,{...verification,code:"tampered"}),false);
});
