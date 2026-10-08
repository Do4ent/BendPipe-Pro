import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessProtocol,
  dimensionAuditDownloadHistoryExportReadinessProtocolSignature,
  dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 719: history readiness protocol signature validates canonical protocol",()=>{
  const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol();
  const signature=dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(signature,protocol),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(signature+"x",protocol),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(signature,{...protocol,codes:[...protocol.codes].reverse()}),false);
});
