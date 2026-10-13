import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_HISTORY_SCHEMA,
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 831: export event history snapshot is self-contained and valid",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-08T20:01:00.000Z");
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_HISTORY_SCHEMA);
  assert.equal(snapshot.event_count,1);
  assert.equal(snapshot.events_valid,true);
  assert.equal(snapshot.summary_valid,true);
  assert.equal(snapshot.summary.total,1);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid({...snapshot,event_count:2}),false);
});
