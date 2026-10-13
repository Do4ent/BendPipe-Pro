import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1080: envelope builder rejects non-array events",()=>{
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelope({}, {}, null),
    {name:"TypeError",message:"history export events must be an array"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelope({}, {}, "events"),
    {name:"TypeError",message:"history export events must be an array"}
  );
});

test("question 1081: envelope snapshot builder rejects non-array events",()=>{
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot({}, null),
    {name:"TypeError",message:"history export events must be an array"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot({}, "events"),
    {name:"TypeError",message:"history export events must be an array"}
  );
});
