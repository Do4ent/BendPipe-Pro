import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolValidation
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 933-935: protocol validation fails closed on non-canonical scalar and code-list types",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  assert.equal(dimensionAuditDownloadHistoryProtocolValidation(protocol).valid,true);

  assert.equal(dimensionAuditDownloadHistoryProtocolValidation({...protocol,schema:new String(protocol.schema)}).valid,false);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidation({...protocol,integrity_codes:{}}).valid,false);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidation({...protocol,validation_codes:{}}).valid,false);

  const badIntegrity=[...protocol.integrity_codes];
  badIntegrity[0]=new String(badIntegrity[0]);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidation({...protocol,integrity_codes:badIntegrity}).valid,false);

  const badValidation=[...protocol.validation_codes];
  badValidation[0]=new String(badValidation[0]);
  assert.equal(dimensionAuditDownloadHistoryProtocolValidation({...protocol,validation_codes:badValidation}).valid,false);
});
