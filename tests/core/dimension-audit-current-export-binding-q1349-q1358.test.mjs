import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1349: current chain snapshot validity reuses one history and chain context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshotValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readiness=dimensionAuditDownloadHistoryExportReadiness\(history\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);return dimensionAuditDownloadHistoryExportChainSnapshotValid\(chainSnapshot,readiness\);\}/);
});

test("question 1350: current chain snapshot signature getter returns the snapshot signature",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshotSignature:\(\)=>dimensionAuditDownloadHistoryExportChainSnapshot\(\)\.snapshot_signature/);
});

test("question 1351: current chain snapshot signature validation binds signature, snapshot and readiness",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshotSignatureValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const readiness=dimensionAuditDownloadHistoryExportReadiness\(history\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);return dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid\(chainSnapshot\.snapshot_signature,chainSnapshot,readiness\);\}/);
});

test("question 1352: current payload binding getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBinding:\(\)=>dimensionAuditDownloadHistoryExportPayloadBinding\(\)/);
});

test("question 1353: current payload binding validity reuses one history-chain context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);return dimensionAuditDownloadHistoryExportPayloadBindingValid\(binding,history,chainSnapshot\);\}/);
});

test("question 1354: current payload binding signature getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSignature:\(\)=>dimensionAuditDownloadHistoryExportPayloadBindingSignature\(\)/);
});

test("question 1355: current payload binding signature validator getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSignatureValid:\(\)=>dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid\(\)/);
});

test("question 1356: current payload binding snapshot getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshot:\(\)=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(\)/);
});

test("question 1357: current payload binding snapshot validity binds one history-chain-binding context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid\(bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1358: current payload binding snapshot signature getter returns snapshot signature",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature:\(\)=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(\)\.snapshot_signature/);
});
