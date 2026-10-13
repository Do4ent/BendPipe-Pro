import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolValidation,
  dimensionAuditDownloadHistoryProtocolValidationSignature,
  dimensionAuditDownloadHistoryProtocolValidationSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1098: protocol validation signature validator accepts canonical validation and fails closed on malformed input",()=>{
  const validation=dimensionAuditDownloadHistoryProtocolValidation(dimensionAuditDownloadHistoryProtocol());
  const signature=dimensionAuditDownloadHistoryProtocolValidationSignature(validation);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidationSignatureValid(signature,validation),true);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidationSignatureValid("",validation),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidationSignatureValid({toString:()=>signature},validation),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidationSignatureValid(signature,{...validation,errors:"none"}),false);
});
