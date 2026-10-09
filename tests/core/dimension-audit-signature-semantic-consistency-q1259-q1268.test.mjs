import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid,
  dimensionAuditDownloadHistoryExportEventSummary,
  dimensionAuditDownloadHistoryExportEventSummarySignature,
  dimensionAuditDownloadHistoryExportEventSummarySignatureValid,
  dimensionAuditDownloadHistoryProtocolBinding,
  dimensionAuditDownloadHistoryProtocolBindingSignature,
  dimensionAuditDownloadHistoryProtocolBindingSignatureValid,
  dimensionAuditDownloadHistoryHealth,
  dimensionAuditDownloadHistoryHealthSignature,
  dimensionAuditDownloadHistoryHealthSignatureValid,
  dimensionAuditDownloadHistoryHealthEmbedding,
  dimensionAuditDownloadHistoryHealthEmbeddingSignature,
  dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid,
  dimensionAuditDownloadHistoryVerification,
  dimensionAuditDownloadHistoryVerificationSignature,
  dimensionAuditDownloadHistoryVerificationSignatureValid,
  dimensionAuditDownloadHistoryVerificationEmbedding,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignature,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid,
  dimensionAuditDownloadHistoryAttestation,
  dimensionAuditDownloadHistoryAttestationSignature,
  dimensionAuditDownloadHistoryAttestationSignatureValid,
  dimensionAuditDownloadHistoryAttestationEmbedding,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignature,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid,
  dimensionAuditDownloadHistoryTrust,
  dimensionAuditDownloadHistoryTrustSignature,
  dimensionAuditDownloadHistoryTrustSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1259: protocol-binding signature rejects semantically inconsistent signed state",()=>{
  const binding=dimensionAuditDownloadHistoryProtocolBinding({});
  const forged={...binding,valid:!binding.valid};
  const signature=dimensionAuditDownloadHistoryProtocolBindingSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingSignatureValid(signature,forged),false);
});

test("question 1260: evidence event-binding rejects a re-signed invalid event",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const forgedBase={...event,code:"READY"};
  const forged={...forgedBase,signature:dimensionAuditDownloadHistoryExportEventSignature(forgedBase)};
  const binding=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature([forged]);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(binding,[forged]),false);
});

test("question 1261: event-summary signature rejects incompatible latest action/outcome",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  const forged={...summary,latest_action:"copy",latest_outcome:"downloaded"};
  const signature=dimensionAuditDownloadHistoryExportEventSummarySignature(forged);
  assert.equal(dimensionAuditDownloadHistoryExportEventSummarySignatureValid(signature,forged),false);
});

test("question 1262: health signature rejects valid/code/error inconsistency",()=>{
  const value=dimensionAuditDownloadHistoryHealth({});
  const forged={...value,valid:!value.valid};
  assert.equal(dimensionAuditDownloadHistoryHealthSignatureValid(dimensionAuditDownloadHistoryHealthSignature(forged),forged),false);
});

test("question 1263: health-embedding signature rejects valid/code/error inconsistency",()=>{
  const value=dimensionAuditDownloadHistoryHealthEmbedding({});
  const forged={...value,valid:!value.valid};
  assert.equal(dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(dimensionAuditDownloadHistoryHealthEmbeddingSignature(forged),forged),false);
});

test("question 1264: verification signature rejects valid/code/error inconsistency",()=>{
  const value=dimensionAuditDownloadHistoryVerification({});
  const forged={...value,valid:!value.valid};
  assert.equal(dimensionAuditDownloadHistoryVerificationSignatureValid(dimensionAuditDownloadHistoryVerificationSignature(forged),forged),false);
});

test("question 1265: verification-embedding signature rejects valid/code/error inconsistency",()=>{
  const value=dimensionAuditDownloadHistoryVerificationEmbedding({});
  const forged={...value,valid:!value.valid};
  assert.equal(dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(dimensionAuditDownloadHistoryVerificationEmbeddingSignature(forged),forged),false);
});

test("question 1266: attestation signature rejects valid/code/error inconsistency",()=>{
  const value=dimensionAuditDownloadHistoryAttestation({});
  const forged={...value,valid:!value.valid};
  assert.equal(dimensionAuditDownloadHistoryAttestationSignatureValid(dimensionAuditDownloadHistoryAttestationSignature(forged),forged),false);
});

test("question 1267: attestation-embedding signature rejects valid/code/error inconsistency",()=>{
  const value=dimensionAuditDownloadHistoryAttestationEmbedding({});
  const forged={...value,valid:!value.valid};
  assert.equal(dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(dimensionAuditDownloadHistoryAttestationEmbeddingSignature(forged),forged),false);
});

test("question 1268: trust signature rejects trusted/code/error inconsistency",()=>{
  const value=dimensionAuditDownloadHistoryTrust({});
  const forged={...value,trusted:!value.trusted};
  assert.equal(dimensionAuditDownloadHistoryTrustSignatureValid(dimensionAuditDownloadHistoryTrustSignature(forged),forged),false);
});
