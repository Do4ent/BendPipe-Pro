import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolValidation,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 603: audit history protocol validation is explicit and fail-closed",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  const valid=dimensionAuditDownloadHistoryProtocolValidation(protocol);
  assert.equal(valid.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_VALIDATION_SCHEMA);
  assert.equal(valid.valid,true);
  assert.equal(valid.code,"OK");
  assert.deepEqual(valid.errors,[]);

  const damaged=dimensionAuditDownloadHistoryProtocolValidation({
    ...protocol,
    attempt_schema:"bad-attempt",
    integrity_codes:["OK"]
  });
  assert.equal(damaged.valid,false);
  assert.equal(damaged.code,"INVALID_ATTEMPT_SCHEMA");
  assert.ok(damaged.errors.includes("INVALID_ATTEMPT_SCHEMA"));
  assert.ok(damaged.errors.includes("INVALID_INTEGRITY_CODES"));
  assert.equal(Object.isFrozen(damaged),true);
});
