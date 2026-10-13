import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionStatus,
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportFinalReady
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 988-989: final export readiness is primitive boolean and invalid actions fail closed",()=>{
  const history={};
  const chain=dimensionAuditDownloadHistoryExportChain();
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  const bindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot(binding,history,chainSnapshot);
  const status=dimensionAuditDownloadHistoryExportActionStatus(bindingSnapshot,history,chainSnapshot);
  const statusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot(status,bindingSnapshot,history,chainSnapshot);
  const copy=dimensionAuditDownloadHistoryExportFinalReady("copy",statusSnapshot,bindingSnapshot,history,chainSnapshot);
  const download=dimensionAuditDownloadHistoryExportFinalReady("download",statusSnapshot,bindingSnapshot,history,chainSnapshot);
  assert.equal(typeof copy,"boolean");
  assert.equal(typeof download,"boolean");
  assert.equal(dimensionAuditDownloadHistoryExportFinalReady(1,statusSnapshot,bindingSnapshot,history,chainSnapshot),false);
  assert.equal(dimensionAuditDownloadHistoryExportFinalReady("print",statusSnapshot,bindingSnapshot,history,chainSnapshot),false);
});
