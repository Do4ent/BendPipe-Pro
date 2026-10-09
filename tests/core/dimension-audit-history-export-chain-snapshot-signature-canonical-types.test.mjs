import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportChainSnapshotSignature,
  dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1148: chain snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",chain_signature:"c",chain_valid:true,chain_signature_valid:true};
  const malformed={...snapshot,chain_valid:1};
  const forged=dimensionAuditDownloadHistoryExportChainSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(forged,malformed),false);
});
