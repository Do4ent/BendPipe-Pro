import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1054: copy event-log serializes the envelope snapshot object",()=>{
  const fn=ui.match(/async function copyDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const envelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\)/);
  assert.match(fn,/const text=JSON\.stringify\(envelopeSnapshot,null,2\)/);
  assert.doesNotMatch(fn,/JSON\.stringify\(snapshot,null,2\)/);
  assert.doesNotMatch(fn,/JSON\.stringify\(envelope,null,2\)/);
});

test("question 1055: download event-log serializes the same envelope snapshot object",()=>{
  const fn=ui.match(/function downloadDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const envelopeSnapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(envelope,events\)/);
  assert.match(fn,/new Blob\(\[JSON\.stringify\(envelopeSnapshot,null,2\)\]/);
  assert.doesNotMatch(fn,/new Blob\(\[JSON\.stringify\(snapshot,null,2\)\]/);
  assert.doesNotMatch(fn,/new Blob\(\[JSON\.stringify\(envelope,null,2\)\]/);
});
