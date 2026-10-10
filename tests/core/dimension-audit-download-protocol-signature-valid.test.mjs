import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadProtocolState,
  dimensionAuditDownloadProtocolSignature,
  dimensionAuditDownloadProtocolSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1121: base download protocol signature validator accepts canonical state and rejects malformed/tampered input",()=>{
  const state=dimensionAuditDownloadProtocolState();
  const signature=dimensionAuditDownloadProtocolSignature(state);
  assert.equal(dimensionAuditDownloadProtocolSignatureValid(signature,state),true);
  assert.equal(dimensionAuditDownloadProtocolSignatureValid("",state),false);
  assert.equal(dimensionAuditDownloadProtocolSignatureValid({toString:()=>signature},state),false);
  assert.equal(dimensionAuditDownloadProtocolSignatureValid(signature,{...state,protocol_consistent:false}),false);
});
