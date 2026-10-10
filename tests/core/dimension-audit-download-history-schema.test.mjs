import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_SCHEMAS,
  dimensionAuditDownloadSchemaSupported
} from "../../src/domain/measurements/audit-download.mjs";

test("question 547: audit download history schema is supported by domain validator",()=>{
  assert.ok(DIMENSION_AUDIT_DOWNLOAD_SCHEMAS.includes("TubeBender.DimensionAuditDownloadHistory.v1"));
  assert.equal(dimensionAuditDownloadSchemaSupported("TubeBender.DimensionAuditDownloadHistory.v1"),true);
});
