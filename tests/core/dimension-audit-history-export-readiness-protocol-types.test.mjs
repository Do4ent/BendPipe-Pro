import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessProtocol,
  dimensionAuditDownloadHistoryExportReadinessProtocolValid,
  dimensionAuditDownloadHistoryExportReadinessProtocolSignature,
  dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 954-955: readiness protocol rejects boxed fields, codes and signature",()=>{
  const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol();
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid(protocol),true);

  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid({...protocol,schema:new String(protocol.schema)}),false);

  const badCodes=[...protocol.codes];
  badCodes[0]=new String(badCodes[0]);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid({...protocol,codes:badCodes}),false);

  const signature=dimensionAuditDownloadHistoryExportReadinessProtocolSignature(protocol);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(signature,protocol),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid(new String(signature),protocol),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid("",protocol),false);
});
