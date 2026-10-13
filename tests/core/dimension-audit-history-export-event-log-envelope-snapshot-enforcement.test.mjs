import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1046: copy event-log enforces signed envelope snapshot",()=>{
  const fn=ui.match(/async function copyDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const envelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\)/);
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid\(envelopeSnapshot,events\)/);
});

test("question 1047: download event-log enforces signed envelope snapshot",()=>{
  const fn=ui.match(/function downloadDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const envelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\)/);
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid\(envelopeSnapshot,events\)/);
  assert.match(ui,/History export event envelope snapshot invalid/);
});
