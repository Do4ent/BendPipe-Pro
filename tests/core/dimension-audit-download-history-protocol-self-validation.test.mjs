import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolSignature,
  dimensionAuditDownloadHistoryProtocolValidation
} from "../../src/domain/measurements/audit-download.mjs";

test("question 614: audit history protocol self-describes its validation layer",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  assert.equal(protocol.validation_schema,"TubeBender.DimensionAuditDownloadHistoryProtocolValidation.v1");
  assert.ok(protocol.validation_codes.includes("INVALID_PROTOCOL_VALIDATION_SCHEMA"));
  assert.ok(protocol.validation_codes.includes("INVALID_PROTOCOL_VALIDATION_CODES"));

  const signature=dimensionAuditDownloadHistoryProtocolSignature(protocol);
  assert.match(signature,/validation_schema/);
  assert.match(signature,/validation_codes/);

  const validation=dimensionAuditDownloadHistoryProtocolValidation(protocol);
  assert.equal(validation.valid,true);
  assert.equal(
    dimensionAuditDownloadHistoryProtocolValidation({...protocol,validation_schema:"bad"}).code,
    "INVALID_PROTOCOL_VALIDATION_SCHEMA"
  );
});
