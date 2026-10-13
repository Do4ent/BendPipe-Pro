import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain,
  dimensionAuditDownloadHistoryExportChainSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBinding,
  dimensionAuditDownloadHistoryExportPayloadBindingValid,
  dimensionAuditDownloadHistoryExportPayloadBindingSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 976-977: payload binding rejects coerced fields and signature",()=>{
  const history=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:history.attempt_count,
    history_snapshot_signature:history.snapshot_signature
  });
  const chain=dimensionAuditDownloadHistoryExportChain(state);
  const chainSnapshot=dimensionAuditDownloadHistoryExportChainSnapshot(chain);
  const binding=dimensionAuditDownloadHistoryExportPayloadBinding(history,chainSnapshot);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingValid(binding,history,chainSnapshot),true);
  for(const [field,value] of [
    ["schema",new String(binding.schema)],
    ["history_snapshot_signature",new String(binding.history_snapshot_signature)],
    ["chain_snapshot_signature",new String(binding.chain_snapshot_signature)],
    ["attempt_count","0"],
    ["chain_attempt_count","0"],
    ["allowed",1],
    ["code",new String(binding.code)],
    ["history_signature_matches_chain",1]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingValid({...binding,[field]:value},history,chainSnapshot),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportPayloadBindingSignature(binding);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(signature,binding,history,chainSnapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid(new String(signature),binding,history,chainSnapshot),false);
});
