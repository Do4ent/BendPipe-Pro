import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportAuthorization,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshot,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainValid,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

function state(trusted=true){
  return dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:1,
    verification_valid:true,
    trusted,
    provenance_valid:true,
    history_snapshot_signature:trusted?"h-ready":"h-untrusted",
    provenance_signature:"p"
  });
}
function chainParts(s=state(true)){
  const readinessSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(s);
  const gate=dimensionAuditDownloadHistoryExportGate(readinessSnapshot,s);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  const authorization=dimensionAuditDownloadHistoryExportAuthorization(decisionSnapshot);
  const authorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization);
  return {readinessSnapshot,gateSnapshot,decisionSnapshot,authorizationSnapshot};
}

test("question 1309: readiness snapshot signature binds to supplied readiness state",()=>{
  const ready=state(true);
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(ready);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(snapshot.snapshot_signature,snapshot,ready),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(snapshot.snapshot_signature,snapshot,state(false)),false);
});

test("question 1310: readiness SnapshotValid and gate validation pass the readiness state into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid\(value\.snapshot_signature,value,state\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid\(value\.snapshot_signature,value,state\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid\(current\.snapshot_signature,current,readiness\)/);
});

test("question 1311: gate snapshot signature binds to readiness snapshot and state",()=>{
  const ready=state(true);
  const parts=chainParts(ready);
  assert.equal(
    dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(parts.gateSnapshot.snapshot_signature,parts.gateSnapshot,parts.readinessSnapshot,ready),
    true
  );
  const other=state(false);
  const otherReadiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(other);
  assert.equal(
    dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(parts.gateSnapshot.snapshot_signature,parts.gateSnapshot,otherReadiness,other),
    false
  );
});

test("question 1312: gate SnapshotValid exposes readiness/state context to its signature validator",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid\(value\.snapshot_signature,value,readinessSnapshot,state\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid\(value\.snapshot_signature,value,readinessSnapshot,state\)/);
});

test("question 1313: decision snapshot signature binds to the supplied gate snapshot",()=>{
  const readyParts=chainParts(state(true));
  const blockedParts=chainParts(state(false));
  assert.equal(
    dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(readyParts.decisionSnapshot.snapshot_signature,readyParts.decisionSnapshot,readyParts.gateSnapshot),
    true
  );
  assert.equal(
    dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(readyParts.decisionSnapshot.snapshot_signature,readyParts.decisionSnapshot,blockedParts.gateSnapshot),
    false
  );
});

test("question 1314: decision SnapshotValid passes its gate snapshot into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid\(value\.snapshot_signature,value,gateSnapshot\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid\(value\.snapshot_signature,value,gateSnapshot\)/);
});

test("question 1315: authorization snapshot signature binds to the supplied decision snapshot",()=>{
  const readyParts=chainParts(state(true));
  const blockedParts=chainParts(state(false));
  assert.equal(
    dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(readyParts.authorizationSnapshot.snapshot_signature,readyParts.authorizationSnapshot,readyParts.decisionSnapshot),
    true
  );
  assert.equal(
    dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(readyParts.authorizationSnapshot.snapshot_signature,readyParts.authorizationSnapshot,blockedParts.decisionSnapshot),
    false
  );
});

test("question 1316: authorization SnapshotValid passes its decision snapshot into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid\(value\.snapshot_signature,value,decisionSnapshot\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid\(value\.snapshot_signature,value,decisionSnapshot\)/);
});

test("question 1317: chain snapshot signature binds to supplied readiness state",()=>{
  const ready=state(true);
  const chain=dimensionAuditDownloadHistoryExportChain(ready);
  const snapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(snapshot.snapshot_signature,snapshot,ready),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(snapshot.snapshot_signature,snapshot,state(false)),false);
});

test("question 1318: chain validity verifies every upstream transition with its actual context",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain(state(true));
  assert.equal(dimensionAuditDownloadHistoryExportChainValid(chain),true);
  assert.match(domain,/dimensionAuditDownloadHistoryExportGateSnapshotValid\(value\.gate_snapshot,value\.readiness_snapshot,value\.readiness_state\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryExportDecisionSnapshotValid\(value\.decision_snapshot,value\.gate_snapshot\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid\(value\.authorization_snapshot,value\.decision_snapshot\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportGateSnapshotValid\(value\.gate_snapshot,value\.readiness_snapshot,value\.readiness_state\)/);
});
