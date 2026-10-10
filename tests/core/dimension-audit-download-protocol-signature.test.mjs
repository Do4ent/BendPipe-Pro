import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadProtocolState,
  dimensionAuditDownloadProtocolSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 516: audit download protocol state has deterministic signature",()=>{
  const state=dimensionAuditDownloadProtocolState();
  const signature=dimensionAuditDownloadProtocolSignature(state);
  assert.equal(typeof signature,"string");
  assert.equal(signature,dimensionAuditDownloadProtocolSignature(dimensionAuditDownloadProtocolState()));
  assert.match(signature,/TubeBender\.DimensionAuditDownloadProtocolState\.v1/);
  assert.doesNotMatch(signature,/generated_at/);
});
