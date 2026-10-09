import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 836: export event history copy is fail-closed on invalid or empty snapshot",()=>{
  const fn=ui.match(/async function copyDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events\)/);
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventHistorySnapshotValid\(snapshot\)/);
  assert.match(fn,/if\(snapshot\.event_count===0\)/);
  assert.match(fn,/navigator\?\.clipboard\?\.writeText/);
  assert.match(fn,/JSON\.stringify\(envelopeSnapshot,null,2\)/);
});
