import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 856: outer history re-sign cannot hide tampered signed event summary",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],"2026-10-08T20:01:00.000Z"
  );
  const tampered={
    ...snapshot,
    summary:{...snapshot.summary,signature:snapshot.summary.signature+"x"}
  };
  tampered.signature=dimensionAuditDownloadHistoryExportEventHistorySignature(tampered);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(tampered),false);
});
