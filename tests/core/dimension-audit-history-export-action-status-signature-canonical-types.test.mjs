import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionStatusSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1208: action-status signature builder rejects coercible non-canonical fields",()=>{
  const status={
    schema:"s",
    ready:true,
    code:"READY",
    payload_binding_snapshot_valid:true,
    payload_binding_allowed:true,
    payload_binding_snapshot_signature:"b"
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportActionStatusSignature(status));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportActionStatusSignature({...status,ready:1}),
    {name:"TypeError",message:"history export action status signature fields must be canonical"}
  );
});
