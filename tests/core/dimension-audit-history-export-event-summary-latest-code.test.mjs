import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummaryValid,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 847: export event summary and signed history expose latest audit code",()=>{
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
  const summary=dimensionAuditDownloadHistoryExportEventSummary([first,second]);
  assert.equal(summary.latest_code,"UNTRUSTED");
  assert.equal(dimensionAuditDownloadHistoryExportEventSummaryValid(summary,[first,second]),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummaryValid({...summary,latest_code:"EMPTY"},[first,second]),false);

  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([first,second],"2026-10-08T20:02:00.000Z");
  assert.equal(snapshot.summary.latest_code,"UNTRUSTED");
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);
});
