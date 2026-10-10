import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegritySignatureValid,
  dimensionAuditDownloadHistoryProtocolBindingSignatureValid,
  dimensionAuditDownloadHistoryValid
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

test("question 1289: integrity signature validator binds to supplied history snapshot",()=>{
  const snapshot=history();
  assert.equal(
    dimensionAuditDownloadHistoryIntegritySignatureValid(snapshot.integrity_signature,snapshot.integrity,snapshot),
    true
  );
  assert.equal(
    dimensionAuditDownloadHistoryIntegritySignatureValid(snapshot.integrity_signature,snapshot.integrity,{}),
    false
  );
});

test("question 1290: protocol-binding signature validator binds to supplied history snapshot",()=>{
  const snapshot=history();
  assert.equal(
    dimensionAuditDownloadHistoryProtocolBindingSignatureValid(snapshot.protocol_binding_signature,snapshot.protocol_binding,snapshot),
    true
  );
  assert.equal(
    dimensionAuditDownloadHistoryProtocolBindingSignatureValid(snapshot.protocol_binding_signature,snapshot.protocol_binding,{}),
    false
  );
});

test("question 1291: envelope signature validation binds embedded integrity to the same snapshot",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryIntegritySignatureValid\(value\.integrity_signature,embeddedIntegrity,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryIntegritySignatureValid\(value\.integrity_signature,coreIntegrity,value\)/);
});

test("question 1292: envelope signature validation binds protocol binding to the same snapshot",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryProtocolBindingSignatureValid\(value\.protocol_binding_signature,embeddedBinding,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryProtocolBindingSignatureValid\(value\.protocol_binding_signature,coreBinding,value\)/);
});

test("question 1293: envelope validity binds embedded integrity to the same snapshot",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryIntegritySignatureValid\(embeddedIntegritySignature,embeddedIntegrity,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryIntegritySignatureValid\(embeddedIntegritySignature,coreIntegrity,value\)/);
});

test("question 1294: envelope validity binds protocol binding to the same snapshot",()=>{
  assert.match(domain,/dimensionAuditDownloadHistoryProtocolBindingSignatureValid\(embeddedBindingSignature,embeddedBinding,value\)/);
  assert.match(domain,/dimensionAuditDownloadHistoryProtocolBindingSignatureValid\(embeddedBindingSignature,coreBinding,value\)/);
});

test("question 1295: current integrity signature manager validates against one history snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistoryIntegritySignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);return dimensionAuditDownloadAttemptHistoryIntegritySignatureValid\(snapshot\.integrity_signature,snapshot\.integrity,snapshot\);\}/);
});

test("question 1296: current protocol-binding signature manager validates against one history snapshot",()=>{
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolBindingSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const binding=dimensionAuditDownloadHistoryProtocolBinding\(snapshot\);return dimensionAuditDownloadHistoryProtocolBindingSignatureValid\(dimensionAuditDownloadHistoryProtocolBindingSignature\(binding\),binding,snapshot\);\}/);
});

test("question 1297: full history validity rejects a tampered envelope while core integrity remains intact",()=>{
  const snapshot=history();
  assert.equal(dimensionAuditDownloadHistoryValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryValid({...snapshot,envelope_signature:"tampered"}),false);
});

test("question 1298: UI fallback history validity mirrors conditional envelope validation",()=>{
  assert.match(ui,/const hasEnvelope=value\.envelope_signature!=null\|\|value\.integrity!=null\|\|value\.protocol_binding!=null;/);
  assert.match(ui,/if\(hasEnvelope\)return integrityValid&&dimensionAuditDownloadAttemptHistoryEnvelopeValid\(value\);/);
  assert.match(ui,/return dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\.valid;/);
});
