import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessProtocolSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1217: readiness-protocol signature builder rejects coercible non-canonical fields",()=>{
  const protocol={
    schema:"s",
    state_schema:"state",
    snapshot_schema:"snapshot",
    codes:["READY","EMPTY"]
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportReadinessProtocolSignature({...protocol,codes:["READY",{toString:()=>"EMPTY"}]}),
    {name:"TypeError",message:"history export readiness protocol signature fields must be canonical"}
  );
});
