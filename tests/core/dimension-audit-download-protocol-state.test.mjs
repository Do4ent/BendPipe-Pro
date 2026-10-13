import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadProtocolState,
  DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES,
  DIMENSION_AUDIT_DOWNLOAD_SCHEMAS,
  DIMENSION_AUDIT_FILENAME_POLICY
} from "../../src/domain/measurements/audit-download.mjs";

test("question 511: audit download protocol state is canonical and immutable",()=>{
  const state=dimensionAuditDownloadProtocolState();
  assert.equal(state.schema,"TubeBender.DimensionAuditDownloadProtocolState.v1");
  assert.equal(state.valid,true);
  assert.equal(state.protocol_consistent,true);
  assert.equal(state.validation_schema,DIMENSION_AUDIT_DOWNLOAD_VALIDATION_SCHEMA);
  assert.deepEqual(state.validation_codes,[...DIMENSION_AUDIT_DOWNLOAD_VALIDATION_CODES]);
  assert.deepEqual(state.schemas,[...DIMENSION_AUDIT_DOWNLOAD_SCHEMAS]);
  assert.deepEqual(state.filename,{...DIMENSION_AUDIT_FILENAME_POLICY});
  assert.equal(Object.isFrozen(state),true);
  assert.equal(Object.isFrozen(state.validation_codes),true);
  assert.equal(Object.isFrozen(state.schemas),true);
  assert.equal(Object.isFrozen(state.filename),true);
});
