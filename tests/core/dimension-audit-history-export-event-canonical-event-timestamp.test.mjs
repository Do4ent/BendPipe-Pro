import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventValid,
  dimensionAuditDownloadHistoryExportEventSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 841: individual export events require canonical UTC ISO generated_at",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",
    history_snapshot_signature:"history",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(event),true);

  const nonCanonical={...event,generated_at:"2026-10-08T20:00:00Z"};
  nonCanonical.signature=dimensionAuditDownloadHistoryExportEventSignature(nonCanonical);
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(nonCanonical),false);
});
