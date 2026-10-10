import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryTrust,
  dimensionAuditDownloadHistoryTrustSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 665: final history trust state has deterministic signature",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  const trust=dimensionAuditDownloadHistoryTrust(snapshot);
  const signature=dimensionAuditDownloadHistoryTrustSignature(trust);
  assert.equal(signature,dimensionAuditDownloadHistoryTrustSignature(dimensionAuditDownloadHistoryTrust(snapshot)));

  const changed={...trust,trusted:false,code:"INVALID_ATTESTATION",errors:["INVALID_ATTESTATION"]};
  assert.notEqual(signature,dimensionAuditDownloadHistoryTrustSignature(changed));
});
