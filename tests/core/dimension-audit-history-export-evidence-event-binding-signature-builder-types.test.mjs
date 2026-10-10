import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1156: evidence event-binding signature builder rejects non-string event signatures",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature([event]));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature([{...event,signature:{toString:()=>event.signature}}]),
    {name:"TypeError",message:"history export event signatures must be strings"}
  );
});
