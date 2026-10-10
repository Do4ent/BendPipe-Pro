import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportChainSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1212: chain signature builder rejects coercible non-canonical fields",()=>{
  const chain={
    schema:"s",
    readiness_snapshot:{snapshot_signature:"r"},
    gate_snapshot:{snapshot_signature:"g"},
    decision_snapshot:{snapshot_signature:"d"},
    authorization_snapshot:{snapshot_signature:"a"},
    allowed:true,
    code:"READY"
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportChainSignature(chain));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportChainSignature({
      ...chain,
      readiness_snapshot:{snapshot_signature:{toString:()=>"r"}}
    }),
    {name:"TypeError",message:"history export chain signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportChainSignature({...chain,allowed:1}),
    {name:"TypeError",message:"history export chain signature fields must be canonical"}
  );
});
