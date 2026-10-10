import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1139: envelope snapshot signature requires canonical signed field types",()=>{
  const canonical={schema:"s",envelope_signature:"sig",envelope_valid:true};
  const malformed={...canonical,envelope_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(malformed),
    {name:"TypeError",message:"history export event-log envelope snapshot signature fields must be canonical"}
  );
});

test("question 1163: envelope snapshot signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={schema:"s",envelope_signature:"sig",envelope_valid:1};
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid("forged",malformed),
    false
  );
});
