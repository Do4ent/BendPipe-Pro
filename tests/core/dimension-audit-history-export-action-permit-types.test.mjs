import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionPermit,
  dimensionAuditDownloadHistoryExportActionPermitValid,
  dimensionAuditDownloadHistoryExportActionPermitSignature,
  dimensionAuditDownloadHistoryExportActionPermitSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 984-985: action permit rejects coerced fields and signature",()=>{
  const permit=dimensionAuditDownloadHistoryExportActionPermit();
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitValid({...permit,ready:String(permit.ready)}),false);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitValid({...permit,action_valid:Number(permit.action_valid)}),false);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitValid({...permit,action_status_snapshot_signature:{}}),false);
  const signature=dimensionAuditDownloadHistoryExportActionPermitSignature(permit);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSignatureValid(signature,permit),true);
  assert.equal(dimensionAuditDownloadHistoryExportActionPermitSignatureValid({toString:()=>signature},permit),false);
});
