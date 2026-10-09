import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1379: attempt-history integrity signature validation binds one audit snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryIntegritySignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadAttemptHistoryIntegritySignatureValid\(snapshot\.integrity_signature,snapshot\.integrity,snapshot\);\}/);
});

test("question 1380: attempt-history snapshot signature validation binds snapshot signature to the same snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadAttemptHistoryAuditSignatureValid\(snapshot\.snapshot_signature,snapshot\);\}/);
});

test("question 1381: attempt-history envelope signature getter comes from audit snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryEnvelopeSignature:\(\)=>dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\.envelope_signature/);
});

test("question 1382: attempt-history envelope signature validation reuses one snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryEnvelopeSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadAttemptHistoryEnvelopeSignatureValid\(snapshot\.envelope_signature,snapshot\);\}/);
});

test("question 1383: attempt-history envelope valid flag is exposed from audit snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryEnvelopeValid:\(\)=>dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\.envelope_valid/);
});

test("question 1384: attempt-history attempts validation checks every current attempt",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryAttemptsValid:\(\)=>dimensionAuditDownloadAttemptHistorySnapshot\(\)\.every\(attempt=>dimensionAuditDownloadAttemptValid\(attempt\)\)/);
});

test("question 1385: attempt-history summary getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySummary:\(\)=>dimensionAuditDownloadAttemptHistorySummary\(\)/);
});

test("question 1386: permit-evidence summary getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryPermitEvidenceSummary:\(\)=>dimensionAuditDownloadHistoryPermitEvidenceSummary\(\)/);
});

test("question 1387: permit-evidence summary validity getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryPermitEvidenceSummaryValid:\(\)=>dimensionAuditDownloadHistoryPermitEvidenceSummaryValid\(\)/);
});

test("question 1388: last-attempt permit evidence safely falls back to empty attempt",()=>{
  assert.match(ui,/currentDimensionAuditDownloadLastAttemptPermitEvidence:\(\)=>dimensionAuditDownloadAttemptPermitEvidence\(dimensionAuditDownloadLastAttempt\(\)\?\?\{\}\)/);
});
