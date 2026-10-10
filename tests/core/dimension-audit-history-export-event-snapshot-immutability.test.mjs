import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 886: domain export-event history snapshot freezes its event container",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],
    "2026-10-09T00:00:01.000Z"
  );
  assert.equal(Object.isFrozen(snapshot),true);
  assert.equal(Object.isFrozen(snapshot.events),true);
  assert.equal(Object.isFrozen(snapshot.events[0]),true);
});
