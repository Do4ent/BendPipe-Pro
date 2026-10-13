import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 898: history snapshot rejects tampered event_count and summary total",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy", outcome:"blocked", code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-09T00:00:01.000Z");
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid({...snapshot,event_count:2}),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid({...snapshot,summary:{...snapshot.summary,total:2}}),false);
});
