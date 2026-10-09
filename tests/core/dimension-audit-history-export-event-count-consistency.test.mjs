import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 897: history snapshot event_count matches events and summary total",()=>{
  const first=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy", outcome:"blocked", code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const second=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download", outcome:"blocked", code:"EMPTY",
    history_snapshot_signature:"h2",
    generated_at:"2026-10-09T00:00:01.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([first,second],"2026-10-09T00:00:02.000Z");
  assert.equal(snapshot.event_count,2);
  assert.equal(snapshot.events.length,2);
  assert.equal(snapshot.summary.total,2);
});
