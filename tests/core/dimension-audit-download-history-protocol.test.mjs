import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_SCHEMA,
  dimensionAuditDownloadHistoryProtocol
} from "../../src/domain/measurements/audit-download.mjs";

test("question 600: audit history protocol snapshot is canonical and immutable",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  assert.equal(protocol.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_SCHEMA);
  assert.equal(protocol.attempt_schema,"TubeBender.DimensionAuditDownloadAttempt.v1");
  assert.equal(protocol.history_schema,"TubeBender.DimensionAuditDownloadHistory.v1");
  assert.equal(protocol.summary_schema,"TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1");
  assert.equal(protocol.integrity_schema,"TubeBender.DimensionAuditDownloadHistoryIntegrity.v1");
  assert.equal(protocol.envelope_schema,"TubeBender.DimensionAuditDownloadHistoryEnvelope.v1");
  assert.ok(protocol.integrity_codes.includes("INVALID_ATTEMPTS"));
  assert.equal(Object.isFrozen(protocol),true);
});
