import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1319: current readiness snapshot signature validation reuses one history and readiness context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readiness=dimensionAuditDownloadHistoryExportReadiness\(history\);const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot\(history\);return dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid\(snapshot\.snapshot_signature,snapshot,readiness\);\}/);
});

test("question 1320: current gate snapshot signature validation uses readiness snapshot and state context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSnapshotSignatureValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readiness=dimensionAuditDownloadHistoryExportReadiness\(history\);const readinessSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot\(history\);/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid\(gateSnapshot\.snapshot_signature,gateSnapshot,readinessSnapshot,readiness\)/);
});

test("question 1321: current decision snapshot signature validation uses its gate snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid:\(\)=>\{[^}]*const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot\(gate\);[^}]*dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid\(decisionSnapshot\.snapshot_signature,decisionSnapshot,gateSnapshot\);\}/);
});

test("question 1322: current authorization snapshot signature validation uses its decision snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid:\(\)=>\{[^}]*const decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot\(decision\);[^}]*dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid\(authorizationSnapshot\.snapshot_signature,authorizationSnapshot,decisionSnapshot\);\}/);
});

test("question 1323: current chain snapshot signature validation uses the current readiness state",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshotSignatureValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readiness=dimensionAuditDownloadHistoryExportReadiness\(history\);/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid\(chainSnapshot\.snapshot_signature,chainSnapshot,readiness\)/);
});

test("question 1324: current payload-binding snapshot signature validation uses history and chain context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid:\(\)=>\{[^}]*dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid\(bindingSnapshot\.snapshot_signature,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1325: current action-status snapshot signature validation API carries complete context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid:\(\)=>\{/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid\(statusSnapshot\.snapshot_signature,statusSnapshot,bindingSnapshot,history,chainSnapshot\)/);
});

test("question 1326: current action-permit snapshot signature validation API carries action and upstream context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid:\(action="copy"\)=>\{/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid\(permitSnapshot\.snapshot_signature,permitSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\)/);
});

test("question 1327: current final-state snapshot signature validation API carries action and upstream context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid:\(action="copy"\)=>\{/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid\(stateSnapshot\.snapshot_signature,stateSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\)/);
});

test("question 1328: current evidence and event-log snapshot signature APIs bind to the current event list",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid\(snapshot\.snapshot_signature,snapshot,events\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid\(snapshot\.snapshot_signature,snapshot,events\)/);
});
