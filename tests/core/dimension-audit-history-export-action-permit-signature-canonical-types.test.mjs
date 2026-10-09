import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionPermitSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1209: action-permit signature builder rejects coercible non-canonical fields",()=>{
  const permit={
    schema:"s",
    action:"copy",
    ready:true,
    code:"READY",
    action_valid:true,
    action_status_snapshot_valid:true,
    action_status_ready:true,
    action_status_snapshot_signature:"st"
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportActionPermitSignature(permit));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportActionPermitSignature({...permit,action:{toString:()=>"copy"}}),
    {name:"TypeError",message:"history export action permit signature fields must be canonical"}
  );
});
