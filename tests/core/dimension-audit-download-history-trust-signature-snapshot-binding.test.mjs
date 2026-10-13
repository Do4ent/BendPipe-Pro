import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryTrust,
  dimensionAuditDownloadHistoryTrustSignature,
  dimensionAuditDownloadHistoryTrustSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1133: trust signature validator binds trust to the supplied history snapshot",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const trust=dimensionAuditDownloadHistoryTrust(snapshot);
  const signature=dimensionAuditDownloadHistoryTrustSignature(trust);
  assert.equal(dimensionAuditDownloadHistoryTrustSignatureValid(signature,trust,snapshot),true);

  const forged={
    ...trust,
    trusted:true,
    code:"OK",
    errors:[]
  };
  const forgedSignature=dimensionAuditDownloadHistoryTrustSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryTrustSignatureValid(forgedSignature,forged,{}),false);
});
