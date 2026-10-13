import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportDecisionSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1214: decision signature builder rejects coercible non-canonical fields",()=>{
  const decision={
    schema:"s",
    allowed:true,
    code:"READY",
    gate_snapshot_valid:true,
    gate_code:"READY",
    gate_allowed:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportDecisionSignature(decision));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportDecisionSignature({...decision,gate_allowed:1}),
    {name:"TypeError",message:"history export decision signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportDecisionSignature({...decision,gate_code:{toString:()=>"READY"}}),
    {name:"TypeError",message:"history export decision signature fields must be canonical"}
  );
});
