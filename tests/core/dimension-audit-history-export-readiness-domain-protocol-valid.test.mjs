import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessProtocol,
  dimensionAuditDownloadHistoryExportReadinessProtocolValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 718: history readiness protocol validates canonical schema and codes",()=>{
  const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol();
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid(protocol),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid({...protocol,schema:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid({...protocol,state_schema:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid({...protocol,snapshot_schema:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid({...protocol,codes:[...protocol.codes].reverse()}),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessProtocolValid({...protocol,codes:[...protocol.codes,"EXTRA"]}),false);
});
