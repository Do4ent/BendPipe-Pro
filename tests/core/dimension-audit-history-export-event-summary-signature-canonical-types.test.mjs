import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventSummarySignature,
  dimensionAuditDownloadHistoryExportEventSummarySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1140: event summary signature validation rejects coercible non-canonical fields",()=>{
  const summary={
    schema:"s",
    total:1,
    blocked:1,
    copied:0,
    downloaded:0,
    failed:0,
    copy:1,
    download:0,
    valid:1,
    invalid:0,
    latest_signature:"sig",
    latest_outcome:"blocked",
    latest_action:"copy",
    latest_code:"EMPTY"
  };
  const malformed={...summary,total:"1"};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventSummarySignature(malformed),
    {name:"TypeError",message:"history export event summary signature fields must be canonical"}
  );
});

test("question 1165: event summary signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={
    schema:"s",
    total:"1",
    blocked:1,
    copied:0,
    downloaded:0,
    failed:0,
    copy:1,
    download:0,
    valid:1,
    invalid:0,
    latest_signature:"sig",
    latest_outcome:"blocked",
    latest_action:"copy",
    latest_code:"EMPTY"
  };
  assert.equal(
    dimensionAuditDownloadHistoryExportEventSummarySignatureValid("forged",malformed),
    false
  );
});
