import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 588: current audit history envelope metadata is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryEnvelopeSignature:\(\)=>dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\.envelope_signature/);
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryEnvelopeValid:\(\)=>dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\.envelope_valid/);
  assert.match(ui,/data-envelope-valid="'\+\(auditDownloadHistorySnapshot\.envelope_valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-envelope-signature="'\+esc\(auditDownloadHistorySnapshot\.envelope_signature\?\?'\'\)\+'"/);
});
