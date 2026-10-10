import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummarySignature,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 877: re-signing cannot hide latest-summary divergence from actual last event",()=>{
  const first=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const second=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"blocked",code:"UNTRUSTED",
    history_snapshot_signature:"history-b",
    generated_at:"2026-10-08T20:01:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [first,second],"2026-10-08T20:02:00.000Z"
  );
  const badSummary={...snapshot.summary,latest_code:"EMPTY"};
  badSummary.signature=dimensionAuditDownloadHistoryExportEventSummarySignature(badSummary);
  const tampered={...snapshot,summary:badSummary};
  tampered.signature=dimensionAuditDownloadHistoryExportEventHistorySignature(tampered);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(tampered),false);
});
