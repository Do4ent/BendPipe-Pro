import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryProtocolBinding,
  dimensionAuditDownloadHistoryProtocolBindingSignature,
  dimensionAuditDownloadHistoryProtocolBindingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1102: protocol binding signature validator accepts canonical binding and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const binding=dimensionAuditDownloadHistoryProtocolBinding(snapshot);
  const signature=dimensionAuditDownloadHistoryProtocolBindingSignature(binding);
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingSignatureValid(signature,binding),true);
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingSignatureValid("",binding),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingSignatureValid({toString:()=>signature},binding),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingSignatureValid(signature,{...binding,code:"tampered"}),false);
});
