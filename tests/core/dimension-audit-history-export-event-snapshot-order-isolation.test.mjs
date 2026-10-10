import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 896: history snapshot order is isolated from later source reordering",()=>{
  const first=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature-a",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const second=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature-b",
    generated_at:"2026-10-09T00:00:01.000Z"
  });
  const source=[first,second];
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(source,"2026-10-09T00:00:02.000Z");
  source.reverse();
  assert.equal(snapshot.events[0].signature,first.signature);
  assert.equal(snapshot.events[1].signature,second.signature);
  assert.equal(snapshot.summary.latest_signature,second.signature);
});
