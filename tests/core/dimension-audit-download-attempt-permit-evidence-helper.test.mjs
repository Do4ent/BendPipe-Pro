import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadAttemptPermitEvidence
} from "../../src/domain/measurements/audit-download.mjs";

test("question 822: canonical permit evidence helper centralizes optional attempt evidence",()=>{
  const none=dimensionAuditDownloadAttemptPermitEvidence({});
  assert.deepEqual(none,{present:false,valid:true,action:null,permit_signature:null,permit_snapshot_signature:null});
  const good=dimensionAuditDownloadAttemptPermitEvidence({
    export_action:"download",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"snapshot"
  });
  assert.equal(good.present,true);
  assert.equal(good.valid,true);
  assert.equal(good.action,"download");
  const bad=dimensionAuditDownloadAttemptPermitEvidence({export_action:"copy"});
  assert.equal(bad.present,true);
  assert.equal(bad.valid,false);
});
