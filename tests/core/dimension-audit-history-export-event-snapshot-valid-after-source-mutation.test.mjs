import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 895: canonical history snapshot stays valid after source mutation",()=>{
  const canonical=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const mutable={...canonical};
  const source=[mutable];
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(source,"2026-10-09T00:00:01.000Z");
  mutable.code="CHANGED";
  source.length=0;
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);
});
