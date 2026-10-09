import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1419: attempt-history summary signature validity getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySummarySignatureValid:\(\)=>dimensionAuditDownloadAttemptHistorySummarySignatureValid\(\)/);
});

test("question 1420: clear attempt-history action remains publicly exposed",()=>{
  assert.match(ui,/clearDimensionAuditDownloadAttemptHistory/);
});

test("question 1421: download-attempt signature helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadAttemptSignature/);
});

test("question 1422: download-attempt signature validator remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadAttemptSignatureValid/);
});

test("question 1423: record download-attempt action remains publicly exposed",()=>{
  assert.match(ui,/recordDimensionAuditDownloadAttempt/);
});

test("question 1424: current download-protocol signature getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadProtocolSignature:\(\)=>dimensionAuditDownloadProtocolSignature\(\)/);
});

test("question 1425: current download-protocol signature validation binds signature to one protocol state",()=>{
  assert.match(ui,/currentDimensionAuditDownloadProtocolSignatureValid:\(\)=>\{const state=auditDownloadDomain\?\.dimensionAuditDownloadProtocolState\?\.\(\)\?\?null;const signature=dimensionAuditDownloadProtocolSignature\(state\);return dimensionAuditDownloadProtocolSignatureValid\(signature,state\);\}/);
});

test("question 1426: current download runtime-state getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadRuntimeState:\(\)=>dimensionAuditDownloadRuntimeState\(\)/);
});

test("question 1427: current download runtime-signature getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadRuntimeSignature:\(\)=>dimensionAuditDownloadRuntimeSignature\(\)/);
});

test("question 1428: current download runtime-validation getter is exposed",()=>{
  assert.match(ui,/currentDimensionAuditDownloadRuntimeValidation:\(\)=>dimensionAuditDownloadRuntimeValidation\(\)/);
});
