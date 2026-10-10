import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventHistorySignature,
  dimensionAuditDownloadHistoryExportEventHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1141: event-history signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={
    schema:"s",
    event_count:1,
    events:[{signature:"e"}],
    summary:{
      schema:"ss",
      signature:"sum",
      total:1,
      latest_signature:"e",
      latest_action:"copy",
      latest_outcome:"blocked",
      latest_code:"EMPTY"
    },
    events_valid:true,
    summary_valid:true,
    summary_signature_valid:true,
    signature_valid:true,
    generated_at:"2026-10-09T00:00:00.000Z"
  };
  const malformed={...snapshot,event_count:"1"};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventHistorySignature(malformed),
    {name:"TypeError",message:"history export event history signature fields must be canonical"}
  );
});

test("question 1168: event-history signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={
    schema:"s",
    event_count:"1",
    events:[{signature:"e"}],
    summary:{
      schema:"ss",
      signature:"sum",
      total:1,
      latest_signature:"e",
      latest_action:"copy",
      latest_outcome:"blocked",
      latest_code:"EMPTY"
    },
    events_valid:true,
    summary_valid:true,
    summary_signature_valid:true,
    signature_valid:true,
    generated_at:"2026-10-09T00:00:00.000Z"
  };
  assert.equal(
    dimensionAuditDownloadHistoryExportEventHistorySignatureValid("forged",malformed),
    false
  );
});
