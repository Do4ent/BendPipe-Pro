import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventLogEnvelopeValid,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1076: envelope validation fails closed on non-array events",()=>{
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeValid({},null),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeValid({},"events"),false);
});

test("question 1077: envelope snapshot validation fails closed on non-array events",()=>{
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid({},null),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid({},"events"),false);
});
