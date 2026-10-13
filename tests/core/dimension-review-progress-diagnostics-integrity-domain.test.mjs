import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  reviewProgressDiagnosticsIntegrity,
  reviewProgressDiagnosticsIntegritySignature,
  REVIEW_PROGRESS_DIAGNOSTICS_INTEGRITY_SCHEMA
} from "../../src/domain/measurements/review-progress.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 419: diagnostics integrity model is domain-owned and UI delegates",()=>{
  const integrity=reviewProgressDiagnosticsIntegrity({
    source:"domain",
    domain_available:true,
    domain_compatible:true,
    domain_status:"compatible",
    diagnostics_available:true,
    snapshot_signature_consistent:true,
    runtime_valid:true
  },true);
  assert.equal(integrity.schema,REVIEW_PROGRESS_DIAGNOSTICS_INTEGRITY_SCHEMA);
  assert.equal(integrity.valid,true);
  assert.equal(Object.isFrozen(integrity),true);
  assert.equal(typeof reviewProgressDiagnosticsIntegritySignature(integrity),"string");
  assert.match(ui,/reviewProgressDomain\?\.reviewProgressDiagnosticsIntegrity/);
  assert.match(ui,/reviewProgressDomain\?\.reviewProgressDiagnosticsIntegritySignature/);
});
