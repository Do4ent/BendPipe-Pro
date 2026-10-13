import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshot,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportActionStatusSnapshot,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportActionPermitSnapshot,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportFinalStateSnapshot,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid,
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealthEmbedding,
  dimensionAuditDownloadHistoryHealthEmbeddingSignature,
  dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid,
  dimensionAuditDownloadHistoryVerificationEmbedding,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignature,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid,
  dimensionAuditDownloadHistoryAttestationEmbedding,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignature,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1269: evidence summary snapshot signature validates its signature-valid flag truthfully",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const forged={...snapshot,summary_signature_valid:false};
  const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(signature,forged),false);
});

test("question 1270: event-log envelope snapshot signature rejects a false envelope-valid flag",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events,"2026-10-09T00:00:01.000Z");
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  const snapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);
  const forged={...snapshot,envelope_valid:false};
  const signature=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(signature,forged),false);
});

test("question 1271: payload-binding snapshot signature rejects a false signature-valid flag",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot();
  const forged={...snapshot,binding_signature_valid:false};
  const signature=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(signature,forged),false);
});

test("question 1272: action-status snapshot signature rejects a false signature-valid flag",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot();
  const forged={...snapshot,status_signature_valid:false};
  const signature=dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(signature,forged),false);
});

test("question 1273: action-permit snapshot signature rejects a false signature-valid flag",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportActionPermitSnapshot();
  const forged={...snapshot,permit_signature_valid:false};
  const signature=dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(signature,forged),false);
});

test("question 1274: final-state snapshot signature rejects a false signature-valid flag",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot();
  const forged={...snapshot,state_signature_valid:false};
  const signature=dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(forged);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(signature,forged),false);
});

function history(){
  return dimensionAuditDownloadHistorySnapshot({
    project_id:"p",project_name:"P",generated_at:"2026-10-09T00:00:00.000Z",attempts:[]
  });
}

test("question 1275: health embedding signature can be bound to its history snapshot",()=>{
  const snapshot=history();
  const embedding=dimensionAuditDownloadHistoryHealthEmbedding(snapshot);
  const signature=dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding);
  assert.equal(dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedding,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedding,{}),false);
});

test("question 1276: verification embedding signature can be bound to its history snapshot",()=>{
  const snapshot=history();
  const embedding=dimensionAuditDownloadHistoryVerificationEmbedding(snapshot);
  const signature=dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding);
  assert.equal(dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedding,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedding,{}),false);
});

test("question 1277: attestation embedding signature can be bound to its history snapshot",()=>{
  const snapshot=history();
  const embedding=dimensionAuditDownloadHistoryAttestationEmbedding(snapshot);
  const signature=dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding);
  assert.equal(dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedding,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedding,{}),false);
});

test("question 1278: manager reuses one history snapshot for embedding signature validation",()=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
  const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
  assert.match(ui,/currentDimensionAuditDownloadHistoryHealthEmbeddingSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);/);
});
