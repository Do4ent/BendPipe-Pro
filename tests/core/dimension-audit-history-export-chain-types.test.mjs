import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainValid,
  dimensionAuditDownloadHistoryExportChainSignature,
  dimensionAuditDownloadHistoryExportChainSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 972-973: export chain rejects coerced fields and signature",()=>{
  const chain=dimensionAuditDownloadHistoryExportChain(dimensionAuditDownloadHistoryExportReadinessState());
  assert.equal(dimensionAuditDownloadHistoryExportChainValid(chain),true);
  for(const [field,value] of [
    ["schema",new String(chain.schema)],
    ["allowed",1],
    ["code",new String(chain.code)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportChainValid({...chain,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportChainSignature(chain);
  assert.equal(dimensionAuditDownloadHistoryExportChainSignatureValid(signature,chain),true);
  assert.equal(dimensionAuditDownloadHistoryExportChainSignatureValid(new String(signature),chain),false);
});
