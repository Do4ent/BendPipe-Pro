import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySignature,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 832: export event history snapshot has deterministic signature",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"downloaded",code:"READY",
    history_snapshot_signature:"history",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"snapshot",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot([event],"2026-10-08T20:01:00.000Z");
  assert.equal(snapshot.signature,dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot));
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySnapshotValid({...snapshot,signature:snapshot.signature+"x"}),false);
});
