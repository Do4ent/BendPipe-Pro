import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 876: event-history signature binds event order",()=>{
  const first=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const second=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"blocked",code:"UNTRUSTED",
    history_snapshot_signature:"history-b",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [first,second],"2026-10-08T20:01:00.000Z"
  );
  const reversed={...snapshot,events:[second,first]};
  assert.notEqual(
    dimensionAuditDownloadHistoryExportEventHistorySignature(reversed),
    snapshot.signature
  );
});
