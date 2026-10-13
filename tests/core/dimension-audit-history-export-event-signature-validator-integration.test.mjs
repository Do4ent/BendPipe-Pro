import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1125: export-event validation rejects stale signature after signed-field tamper",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  assert.equal(dimensionAuditDownloadHistoryExportEventValid(event),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventValid({...event,code:"tampered"}),false);
});
