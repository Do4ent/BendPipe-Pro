import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeValid,
  dimensionAuditDownloadHistoryProtocolBindingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 621: audit history snapshot exposes and binds protocol binding validity",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(snapshot.protocol_binding_valid,true);
  assert.equal(snapshot.protocol_binding_valid,dimensionAuditDownloadHistoryProtocolBindingValid(snapshot));
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...snapshot,protocol_binding_valid:false}),false);
});
