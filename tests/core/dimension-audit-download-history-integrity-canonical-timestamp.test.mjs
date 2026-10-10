import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity
} from "../../src/domain/measurements/audit-download.mjs";

test("question 929: history integrity accepts absent time but rejects non-canonical present time",()=>{
  const withoutTime=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryIntegrity(withoutTime).generated_at_valid,true);
  const withTime=dimensionAuditDownloadHistorySnapshot({attempts:[],generated_at:"2026-10-09T00:00:00.000Z"});
  assert.equal(dimensionAuditDownloadHistoryIntegrity(withTime).generated_at_valid,true);
  assert.equal(dimensionAuditDownloadHistoryIntegrity({...withTime,generated_at:"2026-10-09T00:00:00Z"}).generated_at_valid,false);
});
