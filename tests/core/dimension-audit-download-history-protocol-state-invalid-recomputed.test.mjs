import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolSignature,
  dimensionAuditDownloadHistoryProtocolValidation,
  dimensionAuditDownloadHistoryProtocolValidationSignature,
  dimensionAuditDownloadHistoryProtocolStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 936: internally-consistent invalid protocol state is still rejected",()=>{
  const protocol={...dimensionAuditDownloadHistoryProtocol(),history_schema:"bad"};
  const validation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
  assert.equal(validation.valid,false);
  const state={
    schema:"TubeBender.DimensionAuditDownloadHistoryProtocolState.v1",
    valid:false,
    protocol,
    protocol_signature:dimensionAuditDownloadHistoryProtocolSignature(protocol),
    validation,
    validation_signature:dimensionAuditDownloadHistoryProtocolValidationSignature(validation)
  };
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid(state),false);
});
