import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryEnvelopeSignature,
  dimensionAuditDownloadHistoryEnvelopeSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const canonical={
  schema:"TubeBender.DimensionAuditDownloadHistory.v1",
  snapshot_signature:"snapshot",
  protocol_state_signature:"protocol",
  protocol_binding_signature:"binding",
  integrity_signature:"integrity",
  protocol_binding_valid:true,
  attempts_valid:true,
  summary_valid:true,
  valid:true
};

test("question 1191: history envelope signature builder rejects coercible fields",()=>{
  const signature=dimensionAuditDownloadHistoryEnvelopeSignature(canonical);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid(signature,canonical),true);
  const malformed={...canonical,protocol_binding_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryEnvelopeSignature(malformed),
    {name:"TypeError",message:"audit download history envelope signature fields must be canonical"}
  );
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid("forged",malformed),false);
});
