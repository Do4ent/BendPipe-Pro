import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainValid,
  dimensionAuditDownloadHistoryExportChainSignature,
  dimensionAuditDownloadHistoryExportChainSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 770: canonical history export chain is validated and signed",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain(dimensionAuditDownloadHistoryExportReadinessState());
  const signature=dimensionAuditDownloadHistoryExportChainSignature(chain);
  assert.equal(dimensionAuditDownloadHistoryExportChainValid(chain),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSignatureValid(signature,chain),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainValid({...chain,allowed:!chain.allowed}),false);
  assert.equal(dimensionAuditDownloadHistoryExportChainSignatureValid(signature+"x",chain),false);
});
