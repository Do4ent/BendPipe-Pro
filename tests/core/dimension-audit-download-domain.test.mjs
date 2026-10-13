import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_POLICY_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES,
  DIMENSION_AUDIT_DOWNLOAD_SCHEMAS,
  DIMENSION_AUDIT_FILENAME_POLICY,
  dimensionAuditFilenamePart,
  dimensionAuditJsonFilename,
  dimensionAuditDownloadFilenameSupported,
  dimensionAuditDownloadSchemaSupported,
  dimensionAuditDownloadValidation,
  dimensionAuditDownloadPolicy
} from "../../src/domain/measurements/audit-download.mjs";

test("question 498: pure audit download domain policy is deterministic and fail-closed",()=>{
  assert.equal(DIMENSION_AUDIT_DOWNLOAD_POLICY_SCHEMA,"TubeBender.DimensionAuditDownloadPolicy.v1");
  assert.equal(DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,"TubeBender.DimensionAuditDownloadValidation.v1");
  assert.deepEqual(DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES,[
    "OK","INVALID_FILENAME","INVALID_SNAPSHOT","UNSUPPORTED_SCHEMA"
  ]);
  assert.equal(Object.isFrozen(DIMENSION_AUDIT_DOWNLOAD_SCHEMAS),true);
  assert.equal(Object.isFrozen(DIMENSION_AUDIT_FILENAME_POLICY),true);

  assert.equal(dimensionAuditFilenamePart(" Проект № 1 / αβ ","project"),"Проект_1_αβ");
  const filename=dimensionAuditJsonFilename(
    "project-dimension-audit",
    "2026-10-08T06:00:00.000Z",
    96
  );
  assert.ok(filename.endsWith("-2026-10-08T06-00-00-000Z.json"));
  assert.ok(filename.length<=96);
  assert.equal(dimensionAuditDownloadFilenameSupported(filename),true);
  assert.equal(dimensionAuditDownloadFilenameSupported("../bad.json"),false);

  const good={schema:"TubeBender.DimensionAudit.v1"};
  assert.equal(dimensionAuditDownloadSchemaSupported(good.schema),true);
  assert.equal(dimensionAuditDownloadSchemaSupported("TubeBender.Unknown.v1"),false);
  assert.equal(dimensionAuditDownloadValidation(filename,good).code,"OK");
  assert.equal(dimensionAuditDownloadValidation("../bad.json",good).code,"INVALID_FILENAME");
  assert.equal(dimensionAuditDownloadValidation(filename,[]).code,"INVALID_SNAPSHOT");
  assert.equal(dimensionAuditDownloadValidation(filename,{schema:"TubeBender.Unknown.v1"}).code,"UNSUPPORTED_SCHEMA");

  const policy=dimensionAuditDownloadPolicy();
  assert.equal(policy.schema,DIMENSION_AUDIT_DOWNLOAD_POLICY_SCHEMA);
  assert.equal(policy.validation_schema,DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA);
  assert.equal(Object.isFrozen(policy),true);
  assert.equal(Object.isFrozen(policy.filename),true);
});
