import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeSignature,
  dimensionAuditDownloadHistoryEnvelopeSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1106: history envelope signature validator accepts canonical envelope and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const signature=dimensionAuditDownloadHistoryEnvelopeSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid("",snapshot),false);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid({toString:()=>signature},snapshot),false);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeSignatureValid(signature,{...snapshot,summary_valid:false}),false);
});
