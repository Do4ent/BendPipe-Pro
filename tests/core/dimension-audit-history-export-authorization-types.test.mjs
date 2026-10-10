import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportAuthorizationValid,
  dimensionAuditDownloadHistoryExportAuthorizationSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 968-969: export authorization rejects coerced fields and signature",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain(dimensionAuditDownloadHistoryExportReadinessState());
  const authorization=chain.authorization_snapshot.authorization;
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationValid(authorization),true);
  for(const [field,value] of [
    ["schema",new String(authorization.schema)],
    ["allowed",1],
    ["code",new String(authorization.code)],
    ["decision_snapshot_valid",1],
    ["decision_code",new String(authorization.decision_code)],
    ["decision_allowed",1]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportAuthorizationValid({...authorization,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportAuthorizationSignature(authorization);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(signature,authorization),true);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSignatureValid(new String(signature),authorization),false);
});
