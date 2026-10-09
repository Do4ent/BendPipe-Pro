import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid,
  dimensionAuditDownloadHistoryExportEventHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 840: export event history requires canonical UTC ISO generated_at",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-08T20:01:00.000Z");
  assert.equal(snapshot.generated_at,"2026-10-08T20:01:00.000Z");
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);

  const nonCanonical={...snapshot,generated_at:"2026-10-08T20:01:00Z"};
  nonCanonical.signature=dimensionAuditDownloadHistoryExportEventHistorySignature(nonCanonical);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(nonCanonical),false);
});
