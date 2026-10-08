import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_STATE_SCHEMA,
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolSignature,
  dimensionAuditDownloadHistoryProtocolValidationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 606: audit history protocol state is self-contained and valid",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  assert.equal(state.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_STATE_SCHEMA);
  assert.equal(state.valid,true);
  assert.equal(state.protocol_signature,dimensionAuditDownloadHistoryProtocolSignature(state.protocol));
  assert.equal(state.validation_signature,dimensionAuditDownloadHistoryProtocolValidationSignature(state.validation));
  assert.equal(state.validation.valid,true);
  assert.equal(Object.isFrozen(state),true);
});
