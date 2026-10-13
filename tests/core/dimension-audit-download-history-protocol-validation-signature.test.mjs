import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolValidation,
  dimensionAuditDownloadHistoryProtocolValidationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 604: audit history protocol validation signature is deterministic",()=>{
  const validation=dimensionAuditDownloadHistoryProtocolValidation();
  const signature=dimensionAuditDownloadHistoryProtocolValidationSignature(validation);
  assert.equal(signature,dimensionAuditDownloadHistoryProtocolValidationSignature({...validation,generated_at:"2099-01-01T00:00:00Z"}));
  assert.notEqual(signature,dimensionAuditDownloadHistoryProtocolValidationSignature({...validation,code:"BROKEN"}));
});
