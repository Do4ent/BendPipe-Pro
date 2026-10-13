import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 818: download attempt permit evidence is optional, complete and signed when present",()=>{
  const legacy=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    snapshot_schema:"TubeBender.DimensionAuditDownloadHistory.v1",
    code:"READY",
    preflight_signature:"preflight",
    runtime_signature:"runtime",
    protocol_signature:"protocol",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  assert.equal(Object.hasOwn(legacy,"export_action"),false);
  assert.equal(dimensionAuditDownloadAttemptValid(legacy),true);

  const evidenced=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"history.json",
    snapshot_schema:"TubeBender.DimensionAuditDownloadHistory.v1",
    code:"READY",
    preflight_signature:"preflight",
    runtime_signature:"runtime",
    protocol_signature:"protocol",
    export_action:"download",
    action_permit_signature:"permit-sig",
    action_permit_snapshot_signature:"permit-snapshot-sig",
    generated_at:"2026-10-08T20:00:00.000Z"
  });
  assert.equal(evidenced.export_action,"download");
  assert.equal(evidenced.action_permit_signature,"permit-sig");
  assert.equal(evidenced.action_permit_snapshot_signature,"permit-snapshot-sig");
  assert.equal(dimensionAuditDownloadAttemptValid(evidenced),true);
  assert.notEqual(evidenced.signature,legacy.signature);
  assert.equal(evidenced.signature,dimensionAuditDownloadAttemptSignature(evidenced));

  assert.throws(()=>buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    export_action:"download",
    action_permit_signature:"permit-only"
  }),/permit evidence must be complete/);
  assert.throws(()=>buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    export_action:"print",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"snapshot"
  }),/export_action must be copy or download/);
});
