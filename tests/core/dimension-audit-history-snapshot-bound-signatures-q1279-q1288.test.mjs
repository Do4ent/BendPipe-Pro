import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealth,
  dimensionAuditDownloadHistoryHealthSignature,
  dimensionAuditDownloadHistoryHealthSignatureValid,
  dimensionAuditDownloadHistoryVerification,
  dimensionAuditDownloadHistoryVerificationSignature,
  dimensionAuditDownloadHistoryVerificationSignatureValid,
  dimensionAuditDownloadHistoryAttestation,
  dimensionAuditDownloadHistoryAttestationSignature,
  dimensionAuditDownloadHistoryAttestationSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

function history(){
  return dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
}

test("question 1279: health signature validator binds to supplied history snapshot",()=>{
  const snapshot=history();
  const health=dimensionAuditDownloadHistoryHealth(snapshot);
  const signature=dimensionAuditDownloadHistoryHealthSignature(health);
  assert.equal(dimensionAuditDownloadHistoryHealthSignatureValid(signature,health,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryHealthSignatureValid(signature,health,{}),false);
});

test("question 1280: embedded health validation passes its snapshot into health signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryHealthSignatureValid\(signature,embedded,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryHealthSignatureValid\(signature,current,value\)/);
});

test("question 1281: verification signature validator binds to supplied history snapshot",()=>{
  const snapshot=history();
  const verification=dimensionAuditDownloadHistoryVerification(snapshot);
  const signature=dimensionAuditDownloadHistoryVerificationSignature(verification);
  assert.equal(dimensionAuditDownloadHistoryVerificationSignatureValid(signature,verification,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryVerificationSignatureValid(signature,verification,{}),false);
});

test("question 1282: embedded verification validation passes its snapshot into verification signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryVerificationSignatureValid\(signature,embedded,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryVerificationSignatureValid\(signature,current,value\)/);
});

test("question 1283: attestation signature validator binds to supplied history snapshot",()=>{
  const snapshot=history();
  const attestation=dimensionAuditDownloadHistoryAttestation(snapshot);
  const signature=dimensionAuditDownloadHistoryAttestationSignature(attestation);
  assert.equal(dimensionAuditDownloadHistoryAttestationSignatureValid(signature,attestation,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryAttestationSignatureValid(signature,attestation,{}),false);
});

test("question 1284: embedded attestation validation passes its snapshot into attestation signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryAttestationSignatureValid\(signature,embedded,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryAttestationSignatureValid\(signature,current,value\)/);
});

test("question 1285: embedded health-embedding validation passes its snapshot into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid\(signature,embedded,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid\(signature,current,value\)/);
});

test("question 1286: embedded verification-embedding validation passes its snapshot into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid\(signature,embedded,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid\(signature,current,value\)/);
});

test("question 1287: embedded attestation-embedding validation passes its snapshot into signature validation",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid\(signature,embedded,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid\(signature,current,value\)/);
});

test("question 1288: current manager reuses one audit snapshot for health verification and attestation signatures",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryHealthSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryVerificationSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryAttestationSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);/);
});
