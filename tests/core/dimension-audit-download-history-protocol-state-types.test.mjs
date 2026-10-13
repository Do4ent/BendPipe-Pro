import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 930: protocol state rejects boxed schema and signature fields",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid(state),true);
  for(const field of ["schema","protocol_signature","validation_signature"]){
    assert.equal(dimensionAuditDownloadHistoryProtocolStateValid({...state,[field]:new String(state[field])}),false,field);
  }
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid({...state,valid:1}),false);
});
