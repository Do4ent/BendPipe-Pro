import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1339: current readiness getter uses one explicit history snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadiness:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadHistoryExportReadiness\(history\);\}/);
});

test("question 1340: current readiness snapshot getter uses one explicit history snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSnapshot:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadHistoryExportReadinessSnapshot\(history\);\}/);
});

test("question 1341: current gate getter binds readiness snapshot to the same history",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGate:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readinessSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot\(history\);return dimensionAuditDownloadHistoryExportGate\(readinessSnapshot,history\);\}/);
});

test("question 1342: current gate snapshot getter reuses its gate context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSnapshot:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readinessSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot\(history\);const gate=dimensionAuditDownloadHistoryExportGate\(readinessSnapshot,history\);return dimensionAuditDownloadHistoryExportGateSnapshot\(gate\);\}/);
});

test("question 1343: current decision getter reuses one gate snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecision:\(\)=>\{[^}]*const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot\(gate\);return dimensionAuditDownloadHistoryExportDecision\(gateSnapshot\);\}/);
});

test("question 1344: current decision snapshot getter reuses its decision",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionSnapshot:\(\)=>\{[^}]*const decision=dimensionAuditDownloadHistoryExportDecision\(gateSnapshot\);return dimensionAuditDownloadHistoryExportDecisionSnapshot\(decision\);\}/);
});

test("question 1345: current authorization getter reuses one decision snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorization:\(\)=>\{[^}]*const decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot\(decision\);return dimensionAuditDownloadHistoryExportAuthorization\(decisionSnapshot\);\}/);
});

test("question 1346: current authorization snapshot getter reuses its authorization",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationSnapshot:\(\)=>\{[^}]*const authorization=dimensionAuditDownloadHistoryExportAuthorization\(decisionSnapshot\);return dimensionAuditDownloadHistoryExportAuthorizationSnapshot\(authorization\);\}/);
});

test("question 1347: current chain getter uses one explicit history snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChain:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadHistoryExportChain\(history\);\}/);
});

test("question 1348: current chain snapshot getter reuses its chain",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshot:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);return dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);\}/);
});
