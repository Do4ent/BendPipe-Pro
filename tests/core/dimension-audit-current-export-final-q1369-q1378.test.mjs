import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1369: action permit snapshot signature validation preserves one action context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid:\(action="copy"\)=>\{[^}]*const permitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot\(permit,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid\(permitSnapshot\.snapshot_signature,permitSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1370: final-ready getter binds selected action to the same status context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalReady:\(action="copy"\)=>\{[^}]*return dimensionAuditDownloadHistoryExportFinalReady\(action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1371: final-state getter binds selected action to the same status context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalState:\(action="copy"\)=>\{[^}]*return dimensionAuditDownloadHistoryExportFinalState\(action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1372: final-state validity reuses the computed state and identical action context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateValid:\(action="copy"\)=>\{[^}]*const state=dimensionAuditDownloadHistoryExportFinalState\(action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportFinalStateValid\(state,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1373: final-state signature getter signs the current state for the requested action",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateSignature:\(action="copy"\)=>\{const state=window\.TubeBenderMeasurements\?\.currentDimensionAuditDownloadHistoryExportFinalState\?\.\(action\)\?\?dimensionAuditDownloadHistoryExportFinalState\(action\);return dimensionAuditDownloadHistoryExportFinalStateSignature\(state\);\}/);
});

test("question 1374: final-state snapshot getter reuses one computed state",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateSnapshot:\(action="copy"\)=>\{[^}]*const state=dimensionAuditDownloadHistoryExportFinalState\(action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportFinalStateSnapshot\(state,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1375: final-state snapshot validity binds snapshot to identical action context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateSnapshotValid:\(action="copy"\)=>\{[^}]*const stateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot\(state,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportFinalStateSnapshotValid\(stateSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1376: final-state snapshot signature validation binds the computed snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid:\(action="copy"\)=>\{[^}]*const stateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot\(state,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid\(stateSnapshot\.snapshot_signature,stateSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1377: current attempt-history integrity is derived from one audit snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryIntegrity:\(\)=>dimensionAuditDownloadAttemptHistoryIntegrity\(dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)/);
});

test("question 1378: current attempt-history integrity signature comes from the audit snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryIntegritySignature:\(\)=>dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\.integrity_signature/);
});
