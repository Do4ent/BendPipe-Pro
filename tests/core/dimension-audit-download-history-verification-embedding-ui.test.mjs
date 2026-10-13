import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 654: verification embedding diagnostics are exposed in manager and QA API",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryVerificationEmbedding\(snapshot=\{\}\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryVerificationEmbeddingSignature\(embedding=dimensionAuditDownloadHistoryVerificationEmbedding\(\)\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid\(snapshot=\{\}\)/);
  assert.match(ui,/data-history-verification-embedding-valid="'\+\(auditDownloadHistoryVerificationEmbedding\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-embedded-verification-embedding-valid="'\+\(auditDownloadHistoryEmbeddedVerificationEmbeddingValid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryVerificationEmbedding:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid:/);
});
