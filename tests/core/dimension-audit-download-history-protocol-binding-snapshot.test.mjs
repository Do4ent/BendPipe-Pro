import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryProtocolBindingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 626: audit history snapshot embeds protocol binding diagnostics and signature",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(snapshot.protocol_binding.valid,true);
  assert.equal(snapshot.protocol_binding_valid,true);
  assert.equal(
    snapshot.protocol_binding_signature,
    dimensionAuditDownloadHistoryProtocolBindingSignature(snapshot.protocol_binding)
  );
  assert.match(snapshot.envelope_signature,/protocol_binding_signature/);
});
