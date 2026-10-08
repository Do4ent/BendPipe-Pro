import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportChain
} from "../../src/domain/measurements/audit-download.mjs";

test("question 769: canonical history export chain composes all signed layers",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const chain=dimensionAuditDownloadHistoryExportChain(state);
  assert.equal(chain.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_CHAIN_SCHEMA);
  assert.equal(chain.readiness_state.code,"EMPTY");
  assert.equal(chain.readiness_snapshot.code,"EMPTY");
  assert.equal(chain.gate_snapshot.gate.code,"EMPTY");
  assert.equal(chain.decision_snapshot.decision.code,"EMPTY");
  assert.equal(chain.authorization_snapshot.authorization.code,"EMPTY");
  assert.equal(chain.allowed,false);
  assert.equal(chain.code,"EMPTY");
  assert.equal(Object.isFrozen(chain),true);
});
