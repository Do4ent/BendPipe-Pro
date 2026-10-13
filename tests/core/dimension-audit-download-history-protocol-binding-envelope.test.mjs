import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 627: audit history envelope detects protocol binding diagnostic tampering",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEnvelopeValid({
      ...snapshot,
      protocol_binding:{...snapshot.protocol_binding,code:"BROKEN"}
    }),
    false
  );

  assert.equal(
    dimensionAuditDownloadHistoryEnvelopeValid({
      ...snapshot,
      protocol_binding_signature:"bad"
    }),
    false
  );
});
