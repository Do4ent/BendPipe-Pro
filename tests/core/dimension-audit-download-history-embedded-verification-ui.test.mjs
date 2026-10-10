import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 651: embedded history verification validity is exposed in UI and QA API",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryEmbeddedVerificationValid\(snapshot=\{\}\)/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryEmbeddedVerificationValid/);
  assert.match(ui,/data-history-embedded-verification-valid="'\+\(auditDownloadHistoryEmbeddedVerificationValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-embedded-verification-signature="'\+esc\(auditDownloadHistorySnapshot\.verification_signature\?\?''\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryEmbeddedVerificationValid:\(\)=>dimensionAuditDownloadHistoryEmbeddedVerificationValid\(dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)/);
});
