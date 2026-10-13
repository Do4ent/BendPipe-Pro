import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryTrust,
  dimensionAuditDownloadHistoryTrustSignature,
  dimensionAuditDownloadHistoryTrustSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1120: trust signature validator accepts canonical trust and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const trust=dimensionAuditDownloadHistoryTrust(snapshot);
  const signature=dimensionAuditDownloadHistoryTrustSignature(trust);
  assert.equal(dimensionAuditDownloadHistoryTrustSignatureValid(signature,trust),true);
  assert.equal(dimensionAuditDownloadHistoryTrustSignatureValid("",trust),false);
  assert.equal(dimensionAuditDownloadHistoryTrustSignatureValid({toString:()=>signature},trust),false);
  assert.equal(dimensionAuditDownloadHistoryTrustSignatureValid(signature,{...trust,code:"tampered"}),false);
});
