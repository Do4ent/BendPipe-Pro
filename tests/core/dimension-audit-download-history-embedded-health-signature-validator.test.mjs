import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedHealthValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1109: embedded health validation rejects tampered health through canonical signature validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthValid(snapshot),true);
  const tampered={
    ...snapshot,
    health:{...snapshot.health,code:"tampered"}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthValid(tampered),false);
});
