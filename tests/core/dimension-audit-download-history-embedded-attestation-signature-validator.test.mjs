import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedAttestationValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1117: embedded attestation validation rejects tampered attestation through canonical signature validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationValid(snapshot),true);
  const tampered={
    ...snapshot,
    attestation:{...snapshot.attestation,code:"tampered"}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationValid(tampered),false);
});
