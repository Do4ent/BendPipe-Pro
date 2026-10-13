import test from "node:test";
import assert from "node:assert/strict";
import { buildDimensionAuditDownloadAttempt } from "../../src/domain/measurements/audit-download.mjs";

test("question 596: canonical audit attempt builder enforces outcome/error semantics",()=>{
  assert.throws(
    ()=>buildDimensionAuditDownloadAttempt({status:"failed",error:null}),
    /failed audit download attempt must include error/
  );
  assert.throws(
    ()=>buildDimensionAuditDownloadAttempt({status:"downloaded",error:"unexpected"}),
    /non-failed audit download attempt cannot include error/
  );
  const failed=buildDimensionAuditDownloadAttempt({
    status:"failed",
    error:"disk full",
    generated_at:"2099-01-01T00:00:00Z"
  });
  assert.equal(failed.error,"disk full");
});
