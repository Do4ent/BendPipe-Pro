import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 639: embedded audit history health diagnostics are exposed in UI",()=>{
  const embedding=ui.match(/function dimensionAuditDownloadHistoryHealthEmbedding\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const signature=ui.match(/function dimensionAuditDownloadHistoryHealthEmbeddingSignature\(embedding=dimensionAuditDownloadHistoryHealthEmbedding\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(embedding,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryHealthEmbedding/);
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryHealthEmbeddingSignature/);
  assert.match(ui,/data-embedded-health-code="'\+esc\(auditDownloadHistoryHealthEmbedding\.code\)\+'"/);
  assert.match(ui,/data-embedded-health-signature="'\+esc\(auditDownloadHistoryHealthEmbeddingSignature\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryHealthEmbedding:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryHealthEmbeddingSignature:/);
});
