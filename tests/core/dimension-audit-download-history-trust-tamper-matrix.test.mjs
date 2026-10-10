import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryTrust
} from "../../src/domain/measurements/audit-download.mjs";

test("question 669: final history trust rejects tampering across the assurance chain",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryTrust(snapshot).trusted,true);

  const cases=[
    {...snapshot,verification_signature:"tampered"},
    {...snapshot,verification_embedding_signature:"tampered"},
    {...snapshot,attestation_signature:"tampered"},
    {...snapshot,attestation_embedding_signature:"tampered"}
  ];
  for(const candidate of cases){
    const trust=dimensionAuditDownloadHistoryTrust(candidate);
    assert.equal(trust.trusted,false);
    assert.notEqual(trust.code,"OK");
    assert.ok(trust.errors.length>0);
  }
});
