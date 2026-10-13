import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1399: final-state evidence summary getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary:\(\)=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(\)/);
});

test("question 1400: final-state evidence summary validity binds one event snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid\(summary,events\);\}/);
});

test("question 1401: final-state evidence summary signature getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature:\(\)=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature\(\)/);
});

test("question 1402: final-state evidence summary signature validity getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid:\(\)=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid\(\)/);
});

test("question 1403: final-state evidence summary snapshot getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot:\(\)=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(\)/);
});

test("question 1404: final-state evidence summary snapshot validity reuses one event-summary context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid\(snapshot,events\);\}/);
});

test("question 1405: final-state evidence summary snapshot signature validation binds the computed snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid\(snapshot\.snapshot_signature,snapshot,events\);\}/);
});

test("question 1406: event-binding signature getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature:\(\)=>dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature\(\)/);
});

test("question 1407: event-binding signature validation recomputes against the same event snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature\(events\);return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid\(signature,events\);\}/);
});

test("question 1408: export-event log-envelope signature helpers remain publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature,dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid/);
});
