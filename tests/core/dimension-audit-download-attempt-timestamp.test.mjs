import test from "node:test";
import assert from "node:assert/strict";
import { buildDimensionAuditDownloadAttempt } from "../../src/domain/measurements/audit-download.mjs";

test("question 595: canonical audit attempt builder validates and normalizes timestamps",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    generated_at:"2099-01-01T01:00:00+01:00"
  });
  assert.equal(attempt.generated_at,"2099-01-01T00:00:00.000Z");
  assert.throws(
    ()=>buildDimensionAuditDownloadAttempt({status:"downloaded",generated_at:"not-a-date"}),
    /generated_at must be a valid timestamp/
  );
});
