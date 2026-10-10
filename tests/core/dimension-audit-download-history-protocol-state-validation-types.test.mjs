import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolValidationSignature,
  dimensionAuditDownloadHistoryProtocolStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 937: protocol state rejects type-tampered embedded validation",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  const boxedValidation={...state.validation,code:new String(state.validation.code)};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryProtocolValidationSignature(boxedValidation),
    {name:"TypeError",message:"audit download history protocol validation signature fields must be canonical"}
  );
  const tampered={
    ...state,
    validation:boxedValidation
  };
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid(tampered),false);
});
