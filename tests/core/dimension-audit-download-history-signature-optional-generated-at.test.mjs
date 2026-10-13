import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistorySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1142: canonical history signature remains valid when generated_at is omitted",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistorySignatureValid(snapshot.snapshot_signature,snapshot),true);
});
