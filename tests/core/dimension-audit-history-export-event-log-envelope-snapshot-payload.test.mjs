import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1050: copy event-log exports signed envelope snapshot payload",()=>{
  const fn=ui.match(/async function copyDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const text=JSON\.stringify\(envelopeSnapshot,null,2\)/);
});

test("question 1051: download event-log exports signed envelope snapshot payload",()=>{
  const fn=ui.match(/function downloadDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/new Blob\(\[JSON\.stringify\(envelopeSnapshot,null,2\)\]/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid:/);
});
