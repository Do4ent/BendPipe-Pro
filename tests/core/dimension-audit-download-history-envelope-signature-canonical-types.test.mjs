import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryEnvelopeSignature,
  dimensionAuditDownloadHistoryEnvelopeSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1143: history-envelope signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={
    schema:"s",
    snapshot_signature:"snap",
    protocol_state_signature:"protocol",
    protocol_binding_signature:"binding",
    integrity_signature:"integrity",
    protocol_binding_valid:true,
    attempts_valid:true,
    summary_valid:true,
    valid:true
  };
  const malformed={...snapshot,valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryEnvelopeSignature(malformed),
    {name:"TypeError",message:"audit download history envelope signature fields must be canonical"}
  );
});

test("question 1192: history-envelope signature validator remains fail-closed if malformed input bypasses the strict builder",()=>{
  const malformed={
    schema:"s",
    snapshot_signature:"snap",
    protocol_state_signature:"protocol",
    protocol_binding_signature:"binding",
    integrity_signature:"integrity",
    protocol_binding_valid:true,
    attempts_valid:true,
    summary_valid:true,
    valid:1
  };
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid("forged",malformed),false);
});
