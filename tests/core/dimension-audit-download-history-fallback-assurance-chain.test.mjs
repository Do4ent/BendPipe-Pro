import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 675: UI fallback history snapshot builds full assurance chain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const verification=dimensionAuditDownloadHistoryVerification\(complete\)/);
  assert.match(fn,/verification_signature:dimensionAuditDownloadHistoryVerificationSignature\(verification\)/);
  assert.match(fn,/const verificationEmbedding=dimensionAuditDownloadHistoryVerificationEmbedding\(verified\)/);
  assert.match(fn,/const attestation=dimensionAuditDownloadHistoryAttestation\(verifiedEmbedding\)/);
  assert.match(fn,/attestation_signature:dimensionAuditDownloadHistoryAttestationSignature\(attestation\)/);
  assert.match(fn,/const attestationEmbedding=dimensionAuditDownloadHistoryAttestationEmbedding\(attested\)/);
  assert.match(fn,/attestation_embedding_signature:dimensionAuditDownloadHistoryAttestationEmbeddingSignature\(attestationEmbedding\)/);
});
