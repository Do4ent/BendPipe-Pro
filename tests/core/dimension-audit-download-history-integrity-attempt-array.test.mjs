import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity
} from "../../src/domain/measurements/audit-download.mjs";

test("question 927: history integrity fails closed when attempts is not an array",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const integrity=dimensionAuditDownloadHistoryIntegrity({...snapshot,attempts:{}});
  assert.equal(integrity.valid,false);
  assert.equal(integrity.attempt_count_valid,false);
  assert.equal(integrity.attempts_valid,false);
});
