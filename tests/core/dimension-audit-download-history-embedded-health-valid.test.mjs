import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedHealthValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 635: embedded audit history health is validated against recomputed state",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthValid(snapshot),true);
  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthValid({
      ...snapshot,
      health:{...snapshot.health,code:"BROKEN"}
    }),
    false
  );
  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthValid({
      ...snapshot,
      health_signature:"bad"
    }),
    false
  );
});
