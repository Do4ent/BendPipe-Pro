import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 890: export-event history snapshot is isolated from later source-event mutation",()=>{
  const canonical=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const mutable={...canonical};
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([mutable],"2026-10-09T00:00:01.000Z");
  mutable.code="CHANGED";
  mutable.signature="CHANGED";
  assert.equal(snapshot.events[0].code,"EMPTY");
  assert.equal(snapshot.events[0].signature,canonical.signature);
});
