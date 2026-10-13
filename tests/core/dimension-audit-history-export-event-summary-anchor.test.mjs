import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 851: history snapshot signature binds the signed export event summary",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],"2026-10-08T20:01:00.000Z"
  );
  const signature=dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot);
  const tampered={...snapshot,summary:{...snapshot.summary,signature:snapshot.summary.signature+"x"}};
  assert.notEqual(dimensionAuditDownloadHistoryExportEventHistorySignature(tampered),signature);
});
