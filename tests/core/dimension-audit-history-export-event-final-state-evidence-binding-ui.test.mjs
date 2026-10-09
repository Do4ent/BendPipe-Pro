import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1030-1031: UI/runtime expose exact event-history binding",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature\(/);
  assert.match(ui,/event_binding_signature:value\.event_binding_signature/);
  assert.match(ui,/value\.event_binding_signature===dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature\(events\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignatureValid\(value\.event_binding_signature,events\)/);
  assert.match(ui,/data-history-export-event-final-state-evidence-event-binding-signature="/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature:/);
});

test("question 1167: UI evidence binding no longer relies on String coercion",()=>{
  assert.doesNotMatch(ui,/event_binding_signature:String\(value\.event_binding_signature\?\?""\)/);
});
