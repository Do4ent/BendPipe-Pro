import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SCHEMA,
  dimensionAuditDownloadHistoryExportFinalState,
  dimensionAuditDownloadHistoryExportFinalStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 996-997: final export state is canonical and strictly validated",()=>{
  const state=dimensionAuditDownloadHistoryExportFinalState("copy");
  assert.equal(state.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_FINAL_STATE_SCHEMA);
  assert.equal(typeof state.ready,"boolean");
  assert.equal(typeof state.code,"string");
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateValid(state,"copy"),true);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateValid({...state,ready:String(state.ready)},"copy"),false);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateValid({...state,code:new String(state.code)},"copy"),false);
  const invalid=dimensionAuditDownloadHistoryExportFinalState(1);
  assert.equal(invalid.ready,false);
  assert.equal(invalid.code,"INVALID_EXPORT_ACTION");
});
