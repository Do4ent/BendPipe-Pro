import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 889: export-event history snapshot is isolated from later source-array mutation",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const source=[event];
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(source,"2026-10-09T00:00:01.000Z");
  source.length=0;
  assert.equal(snapshot.event_count,1);
  assert.equal(snapshot.events.length,1);
  assert.equal(snapshot.summary.total,1);
});
