import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1329: current readiness snapshot validation reuses one history snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSnapshotValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot\(history\);return dimensionAuditDownloadHistoryExportReadinessSnapshotValid\(snapshot,history\);\}/);
});

test("question 1330: current gate snapshot validation reuses readiness snapshot and state",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSnapshotValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readiness=dimensionAuditDownloadHistoryExportReadiness\(history\);const readinessSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot\(history\);/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportGateSnapshotValid\(gateSnapshot,readinessSnapshot,readiness\)/);
});

test("question 1331: current decision snapshot validation reuses the gate snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionSnapshotValid:\(\)=>\{/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportDecisionSnapshotValid\(decisionSnapshot,gateSnapshot\)/);
});

test("question 1332: current authorization snapshot validation reuses the decision snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationSnapshotValid:\(\)=>\{/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid\(authorizationSnapshot,decisionSnapshot\)/);
});

test("question 1333: current chain validation validates the chain built from one history snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);return dimensionAuditDownloadHistoryExportChainValid\(chain\);\}/);
});

test("question 1334: current chain snapshot validation binds the snapshot to the same readiness state",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshotValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readiness=dimensionAuditDownloadHistoryExportReadiness\(history\);/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportChainSnapshotValid\(chainSnapshot,readiness\)/);
});

test("question 1335: current payload-binding validation uses the same history and chain snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingValid:\(\)=>\{/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportPayloadBindingValid\(binding,history,chainSnapshot\)/);
});

test("question 1336: current payload-binding snapshot validation uses the same history and chain snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid:\(\)=>\{/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid\(bindingSnapshot,history,chainSnapshot\)/);
});

test("question 1337: current evidence summary validation reuses one event list",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid\(summary,events\);\}/);
});

test("question 1338: current evidence summary snapshot validation reuses one event list",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid:\(\)=>\{const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\);const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\);const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(summary,events\);return dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid\(snapshot,events\);\}/);
});
