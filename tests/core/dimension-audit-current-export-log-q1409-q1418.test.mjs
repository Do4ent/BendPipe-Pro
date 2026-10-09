import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1409: export-event log-envelope getter binds history and evidence to one event snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelope:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);return dimensionAuditDownloadHistoryExportEventLogEnvelope\(history,evidence,events\);\}/);
});

test("question 1410: export-event log-envelope validity reuses the same event context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope\(history,evidence,events\);return dimensionAuditDownloadHistoryExportEventLogEnvelopeValid\(envelope,events\);\}/);
});

test("question 1411: export-event log-envelope snapshot getter reuses one computed envelope",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope\(history,evidence,events\);return dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\);\}/);
});

test("question 1412: export-event log-envelope snapshot validity binds one computed snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope\(history,evidence,events\);const snapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\);return dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid\(snapshot,events\);\}/);
});

test("question 1413: export-event log-envelope snapshot signature validation binds the computed snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope\(history,evidence,events\);const snapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\);return dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid\(snapshot\.snapshot_signature,snapshot,events\);\}/);
});

test("question 1414: copy export-events action remains publicly exposed",()=>{
  assert.match(ui,/copyDimensionAuditHistoryExportEvents/);
});

test("question 1415: download export-events action remains publicly exposed",()=>{
  assert.match(ui,/downloadDimensionAuditHistoryExportEvents/);
});

test("question 1416: clear export-event history action remains publicly exposed",()=>{
  assert.match(ui,/clearDimensionAuditDownloadHistoryExportEventHistory/);
});

test("question 1417: attempt-history summary validity getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySummaryValid:\(\)=>dimensionAuditDownloadAttemptHistorySummaryValid\(\)/);
});

test("question 1418: attempt-history summary signature getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySummarySignature:\(\)=>dimensionAuditDownloadAttemptHistorySummarySignature\(\)/);
});
