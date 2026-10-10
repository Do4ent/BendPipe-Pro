import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolValidation
} from "../../src/domain/measurements/audit-download.mjs";

test("question 679: audit history protocol binds generated_at integrity diagnostics",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  assert.ok(protocol.integrity_codes.includes("INVALID_GENERATED_AT"));

  const damaged={
    ...protocol,
    integrity_codes:protocol.integrity_codes.filter(code=>code!=="INVALID_GENERATED_AT")
  };
  const validation=dimensionAuditDownloadHistoryProtocolValidation(damaged);
  assert.equal(validation.valid,false);
  assert.ok(validation.errors.includes("INVALID_INTEGRITY_CODES"));
});
