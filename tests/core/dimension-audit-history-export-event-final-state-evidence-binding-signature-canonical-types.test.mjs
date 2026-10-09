import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1155: evidence event binding signature rejects coercible non-string event signatures",()=>{
  const events=[{signature:"e1"}];
  const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(signature,events),true);
  const malformed=[{signature:{toString:()=>"e1"}}];
  const forged=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid(forged,malformed),false);
});
