import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportGateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1215: gate signature builder rejects coercible non-canonical fields",()=>{
  const gate={
    schema:"s",
    allowed:true,
    code:"READY",
    readiness_code:"READY",
    snapshot_valid:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportGateSignature(gate));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportGateSignature({...gate,allowed:1}),
    {name:"TypeError",message:"history export gate signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportGateSignature({...gate,readiness_code:{toString:()=>"READY"}}),
    {name:"TypeError",message:"history export gate signature fields must be canonical"}
  );
});
