import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryIntegritySignature,
  dimensionAuditDownloadHistoryIntegritySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const canonical={
  schema:"TubeBender.DimensionAuditDownloadHistoryIntegrity.v1",
  valid:true,
  code:"OK",
  errors:[],
  history_schema_valid:true,
  generated_at_valid:true,
  attempt_count_valid:true,
  attempts_valid:true,
  summary_valid:true,
  summary_signature_valid:true,
  protocol_state_valid:true,
  protocol_state_signature_valid:true,
  snapshot_signature_valid:true
};

test("question 1189: history integrity signature requires canonical signed field types",()=>{
  const signature=dimensionAuditDownloadHistoryIntegritySignature(canonical);
  assert.equal(dimensionAuditDownloadHistoryIntegritySignatureValid(signature,canonical),true);

  const malformed={...canonical,history_schema_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryIntegritySignature(malformed),
    {name:"TypeError",message:"audit download history integrity signature fields must be canonical"}
  );
  assert.equal(dimensionAuditDownloadHistoryIntegritySignatureValid("forged",malformed),false);
});
