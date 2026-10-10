import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 901: history snapshot rejects string event_count",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"h1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-09T00:00:01.000Z");
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid({...snapshot,event_count:"1"}),false);
});
