import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1139: envelope snapshot signature requires canonical signed field types",()=>{
  const canonical={schema:"s",envelope_signature:"sig",envelope_valid:true};
  const malformed={...canonical,envelope_valid:1};
  const forged=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(forged,malformed),false);
});
