import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 848: history snapshot signature binds complete latest event summary",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],"2026-10-08T20:01:00.000Z"
  );
  const original=dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot);

  const changedAction={...snapshot,summary:{...snapshot.summary,latest_action:"download"}};
  assert.notEqual(dimensionAuditDownloadHistoryExportEventHistorySignature(changedAction),original);

  const changedOutcome={...snapshot,summary:{...snapshot.summary,latest_outcome:"failed"}};
  assert.notEqual(dimensionAuditDownloadHistoryExportEventHistorySignature(changedOutcome),original);
});
