import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 835: export event history can be downloaded only from a valid non-empty snapshot",()=>{
  const fn=ui.match(/function downloadDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventHistorySnapshot\(events\)/);
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventHistorySnapshotValid\(snapshot\)/);
  assert.match(fn,/if\(snapshot\.event_count===0\)/);
  assert.match(fn,/new Blob\(\[JSON\.stringify\(envelopeSnapshot,null,2\)\],\{type:"application\/json"\}\)/);
  assert.match(ui,/data-download-dimension-audit-history-export-events/);
  assert.match(ui,/addEventListener\("click",downloadDimensionAuditHistoryExportEvents\)/);
});
