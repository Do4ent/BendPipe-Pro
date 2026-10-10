import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 641: embedded health embedding diagnostics are validated against recomputed state",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid({
      ...snapshot,
      health_embedding:{...snapshot.health_embedding,code:"BROKEN"}
    }),
    false
  );

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid({
      ...snapshot,
      health_embedding_signature:"bad"
    }),
    false
  );
});
