import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1111: embedded health-embedding validation rejects tampered embedding through canonical signature validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(snapshot),true);
  const tampered={
    ...snapshot,
    health_embedding:{...snapshot.health_embedding,code:"tampered"}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(tampered),false);
});
