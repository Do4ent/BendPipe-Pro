import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1389: export-event history getter returns the current event-list snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventHistory:\(\)=>dimensionAuditDownloadHistoryExportEventListSnapshot\(\)/);
});

test("question 1390: export-event summary getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSummary:\(\)=>dimensionAuditDownloadHistoryExportEventSummary\(\)/);
});

test("question 1391: export-event summary validity getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSummaryValid:\(\)=>dimensionAuditDownloadHistoryExportEventSummaryValid\(\)/);
});

test("question 1392: export-event summary signature is computed from the current summary",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSummarySignature:\(\)=>dimensionAuditDownloadHistoryExportEventSummarySignature\(dimensionAuditDownloadHistoryExportEventSummary\(\)\)/);
});

test("question 1393: export-event summary signature validation reuses one summary",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSummarySignatureValid:\(\)=>\{const summary=dimensionAuditDownloadHistoryExportEventSummary\(\);return dimensionAuditDownloadHistoryExportEventSummarySignatureValid\(summary\.signature,summary\);\}/);
});

test("question 1394: export-event history snapshot getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSnapshot:\(\)=>dimensionAuditDownloadHistoryExportEventHistorySnapshot\(\)/);
});

test("question 1395: export-event history snapshot validity getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSnapshotValid:\(\)=>dimensionAuditDownloadHistoryExportEventHistorySnapshotValid\(\)/);
});

test("question 1396: export-event history snapshot signature validation reuses one snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSnapshotSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(\);return dimensionAuditDownloadHistoryExportEventHistorySignatureValid\(snapshot\.signature,snapshot\);\}/);
});

test("question 1397: export-event signature helpers remain publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventSignature,dimensionAuditDownloadHistoryExportEventSignatureValid/);
});

test("question 1398: latest export-event getter clones the last event and safely falls back to null",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryLatestExportEvent:\(\)=>clone\(dimensionAuditDownloadHistoryExportEventListSnapshot\(\)\.at\(-1\)\?\?null\)/);
});
