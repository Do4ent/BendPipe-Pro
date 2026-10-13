import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

function event(code="EMPTY"){
  return buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code,
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
}

test("question 1299: evidence summary snapshot signature validates against supplied events",()=>{
  const events=[event()];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  assert.equal(
    dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(snapshot.snapshot_signature,snapshot,events),
    true
  );
  assert.equal(
    dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(snapshot.snapshot_signature,snapshot,[event("OTHER")]),
    false
  );
});

test("question 1300: event-log envelope snapshot signature validates against supplied events",()=>{
  const events=[event()];
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events,"2026-10-09T00:00:01.000Z");
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  const snapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(snapshot.snapshot_signature,snapshot,events),
    true
  );
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(snapshot.snapshot_signature,snapshot,[]),
    false
  );
});

test("question 1301: payload-binding snapshot signature accepts history and chain context",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid\(signature,snapshot=\{\},historySnapshot=null,chainSnapshot=null\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid\(signature,snapshot=\{\},historySnapshot=null,chainSnapshot=null\)/);
});

test("question 1302: action-status snapshot signature accepts upstream binding history and chain context",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid\(signature,snapshot=\{\},bindingSnapshot=null,historySnapshot=null,chainSnapshot=null\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid\(signature,snapshot=\{\},bindingSnapshot=null,historySnapshot=null,chainSnapshot=null\)/);
});

test("question 1303: action-permit snapshot signature accepts complete action context",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid\(signature,snapshot=\{\},action=null,statusSnapshot=null,bindingSnapshot=null,historySnapshot=null,chainSnapshot=null\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid\(signature,snapshot=\{\},action=null,statusSnapshot=null,bindingSnapshot=null,historySnapshot=null,chainSnapshot=null\)/);
});

test("question 1304: final-state snapshot signature accepts complete action context",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid\(signature,snapshot=\{\},action=null,statusSnapshot=null,bindingSnapshot=null,historySnapshot=null,chainSnapshot=null\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid\(signature,snapshot=\{\},action=null,statusSnapshot=null,bindingSnapshot=null,historySnapshot=null,chainSnapshot=null\)/);
});

test("question 1305: evidence summary SnapshotValid passes events into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid\(value\.snapshot_signature,value,events\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid\(value\.snapshot_signature,value,events\)/);
});

test("question 1306: event-log envelope SnapshotValid passes events into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid\(value\.snapshot_signature,value,events\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid\(value\.snapshot_signature,value,events\)/);
});

test("question 1307: payload-binding SnapshotValid passes history and chain into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid\(value\.snapshot_signature,value,historySnapshot,chainSnapshot\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid\(value\.snapshot_signature,value,historySnapshot,chainSnapshot\)/);
});

test("question 1308: action status permit and final SnapshotValid pass complete context into signature validation",()=>{
  for(const source of [domain,ui]){
    assert.match(source,/dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid\(value\.snapshot_signature,value,bindingSnapshot,historySnapshot,chainSnapshot\)/);
    assert.match(source,/dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid\(value\.snapshot_signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot\)/);
    assert.match(source,/dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid\(value\.snapshot_signature,value,action,statusSnapshot,bindingSnapshot,historySnapshot,chainSnapshot\)/);
  }
});
