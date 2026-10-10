import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportAuthorizationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1213: authorization signature builder rejects coercible non-canonical fields",()=>{
  const authorization={
    schema:"s",
    allowed:true,
    code:"READY",
    decision_snapshot_valid:true,
    decision_code:"READY",
    decision_allowed:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportAuthorizationSignature(authorization));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportAuthorizationSignature({...authorization,allowed:1}),
    {name:"TypeError",message:"history export authorization signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportAuthorizationSignature({...authorization,decision_code:{toString:()=>"READY"}}),
    {name:"TypeError",message:"history export authorization signature fields must be canonical"}
  );
});
