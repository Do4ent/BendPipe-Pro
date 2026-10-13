import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadProtocolState,
  dimensionAuditDownloadProtocolSignature,
  dimensionAuditDownloadProtocolSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1132: protocol signature validator is bound to canonical protocol state",()=>{
  const state=dimensionAuditDownloadProtocolState();
  const signature=dimensionAuditDownloadProtocolSignature(state);
  assert.equal(dimensionAuditDownloadProtocolSignatureValid(signature,state),true);

  const tampered={
    ...state,
    validation_codes:[...state.validation_codes,"FORGED"]
  };
  const forgedSignature=dimensionAuditDownloadProtocolSignature(tampered);
  assert.equal(dimensionAuditDownloadProtocolSignatureValid(forgedSignature,tampered),false);
});
