import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1036-1037: copy/download build signed envelope before snapshot export",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventLogEnvelope\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventLogEnvelopeValid\(/);
  assert.match(ui,/const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope\(snapshot,evidenceSummarySnapshot,events\)/);
  assert.match(ui,/const envelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid\(envelopeSnapshot,events\)/);
  assert.match(ui,/const text=JSON\.stringify\(envelopeSnapshot,null,2\)/);
  assert.match(ui,/new Blob\(\[JSON\.stringify\(envelopeSnapshot,null,2\)\]/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelope:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeValid:/);
});
