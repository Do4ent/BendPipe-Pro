import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 658: history attestation is exposed in manager and QA API",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryAttestation\(snapshot=\{\}\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryAttestationSignature\(attestation=dimensionAuditDownloadHistoryAttestation\(\)\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryEmbeddedAttestationValid\(snapshot=\{\}\)/);
  assert.match(ui,/data-history-attestation-valid="'\+\(auditDownloadHistoryAttestation\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-embedded-attestation-valid="'\+\(auditDownloadHistoryEmbeddedAttestationValid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryAttestation:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryEmbeddedAttestationValid:/);
});
