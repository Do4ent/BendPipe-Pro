import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateSignature,
  dimensionAuditDownloadHistoryProtocolStateSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1096: protocol state signature validator accepts canonical state and rejects malformed/tampered input",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  const signature=dimensionAuditDownloadHistoryProtocolStateSignature(state);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateSignatureValid(signature,state),true);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateSignatureValid("",state),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateSignatureValid({toString:()=>signature},state),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateSignatureValid(signature,{...state,valid:false}),false);
});
