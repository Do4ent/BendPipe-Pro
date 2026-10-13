import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventHistorySignature,
  dimensionAuditDownloadHistoryExportEventHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 871: export-event history signature has explicit validation API",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history-a",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot(
    [event],"2026-10-08T20:01:00.000Z"
  );
  const signature=dimensionAuditDownloadHistoryExportEventHistorySignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventHistorySignatureValid(signature+"x",snapshot),false);
});
