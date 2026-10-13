import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 938-940: envelope validation rejects coerced embedded and envelope signature types",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...snapshot,integrity_signature:new String(snapshot.integrity_signature)}),false);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...snapshot,protocol_binding_signature:new String(snapshot.protocol_binding_signature)}),false);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...snapshot,envelope_signature:new String(snapshot.envelope_signature)}),false);
});
