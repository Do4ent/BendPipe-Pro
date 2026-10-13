import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryProtocolBinding,
  dimensionAuditDownloadHistoryProtocolBindingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 624: audit history protocol binding signature is deterministic",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const binding=dimensionAuditDownloadHistoryProtocolBinding(snapshot);
  const signature=dimensionAuditDownloadHistoryProtocolBindingSignature(binding);
  assert.equal(signature,dimensionAuditDownloadHistoryProtocolBindingSignature({...binding,generated_at:"2099-01-01T00:00:00Z"}));
  assert.notEqual(signature,dimensionAuditDownloadHistoryProtocolBindingSignature({...binding,signature_valid:false}));
});
