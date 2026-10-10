import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 662: attestation embedding diagnostics are exposed in manager and QA API",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryAttestationEmbedding\(snapshot=\{\}\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryAttestationEmbeddingSignature\(embedding=dimensionAuditDownloadHistoryAttestationEmbedding\(\)\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid\(snapshot=\{\}\)/);
  assert.match(ui,/data-history-attestation-embedding-valid="'\+\(auditDownloadHistoryAttestationEmbedding\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-embedded-attestation-embedding-valid="'\+\(auditDownloadHistoryEmbeddedAttestationEmbeddingValid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryAttestationEmbedding:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid:/);
});
