import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SCHEMA,
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventValid,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 826: history export events are independent, signed and summarized",()=>{
  const blocked=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const downloaded=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",
    outcome:"downloaded",
    code:"READY",
    history_snapshot_signature:"history-b",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"permit-snapshot",
    generated_at:"2026-10-08T20:01:00.000Z"
  });
  assert.equal(blocked.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_SCHEMA);
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(blocked),true);
  assert.equal(downloaded.signature,dimensionAuditDownloadHistoryExportEventSignature(downloaded));
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(downloaded),true);
  assert.throws(()=>buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"downloaded"
  }),/copy history export cannot have downloaded outcome/);
  assert.throws(()=>buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"downloaded"
  }),/requires permit evidence/);
  const summary=dimensionAuditDownloadHistoryExportEventSummary([blocked,downloaded]);
  assert.equal(summary.total,2);
  assert.equal(summary.blocked,1);
  assert.equal(summary.downloaded,1);
  assert.equal(summary.copy,1);
  assert.equal(summary.download,1);
  assert.equal(summary.valid,2);
  assert.equal(summary.invalid,0);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummaryValid(summary,[blocked,downloaded]),true);
});
