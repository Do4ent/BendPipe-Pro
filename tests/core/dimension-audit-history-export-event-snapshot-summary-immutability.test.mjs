import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 888: export-event history snapshot keeps summary immutable",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-09T00:00:01.000Z");
  assert.equal(Object.isFrozen(snapshot.summary),true);
  assert.equal(snapshot.summary.total,1);
});
