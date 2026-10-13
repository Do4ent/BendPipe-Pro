import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1359: payload binding snapshot signature validation reuses one history-chain-binding context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid\(bindingSnapshot\.snapshot_signature,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1360: action-ready getter validates binding snapshot before allowed flag",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionReady:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid\(bindingSnapshot,history,chainSnapshot\)&&binding\.allowed===true;\}/);
});

test("question 1361: action status getter reuses one history-chain-binding context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatus:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionStatus\(bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1362: action status validity reuses its computed status and context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);const status=dimensionAuditDownloadHistoryExportActionStatus\(bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionStatusValid\(status,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1363: action status snapshot getter binds status to the same context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusSnapshot:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);const status=dimensionAuditDownloadHistoryExportActionStatus\(bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionStatusSnapshot\(status,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1364: action status snapshot validity reuses one computed snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusSnapshotValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);const status=dimensionAuditDownloadHistoryExportActionStatus\(bindingSnapshot,history,chainSnapshot\);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot\(status,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionStatusSnapshotValid\(statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1365: action status snapshot signature validation binds the computed snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid:\(\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);const status=dimensionAuditDownloadHistoryExportActionStatus\(bindingSnapshot,history,chainSnapshot\);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot\(status,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid\(statusSnapshot\.snapshot_signature,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1366: action permit getter preserves selected action and shared context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionPermit:\(action="copy"\)=>\{const history=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const chain=dimensionAuditDownloadHistoryExportChain\(history\);const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot\(chain\);const binding=dimensionAuditDownloadHistoryExportPayloadBinding\(history,chainSnapshot\);const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(binding,history,chainSnapshot\);const status=dimensionAuditDownloadHistoryExportActionStatus\(bindingSnapshot,history,chainSnapshot\);const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot\(status,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionPermit\(action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1367: action permit snapshot getter reuses one permit computation",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionPermitSnapshot:\(action="copy"\)=>\{[^}]*const permit=dimensionAuditDownloadHistoryExportActionPermit\(action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionPermitSnapshot\(permit,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});

test("question 1368: action permit snapshot validity binds permit snapshot to identical action context",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionPermitSnapshotValid:\(action="copy"\)=>\{[^}]*const permitSnapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot\(permit,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);return dimensionAuditDownloadHistoryExportActionPermitSnapshotValid\(permitSnapshot,action,statusSnapshot,bindingSnapshot,history,chainSnapshot\);\}/);
});
