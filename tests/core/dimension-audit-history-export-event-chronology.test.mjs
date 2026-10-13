import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 846: export event history is chronological",()=>{
  const first=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const second=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-b",
    generated_at:"2026-10-08T20:01:00.000Z"
  });

  assert.throws(()=>dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [second,first],"2026-10-08T20:02:00.000Z"
  ),/must be chronological/);

  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [first,second],"2026-10-08T20:02:00.000Z"
  );
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);

  const reversed={...snapshot,events:[second,first]};
  reversed.signature=dimensionAuditDownloadHistoryExportEventHistorySignature(reversed);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(reversed),false);
});
