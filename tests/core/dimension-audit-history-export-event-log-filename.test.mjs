import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 864: export-event log download uses canonical safe JSON filename policy",()=>{
  const fn=ui.match(/function downloadDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/dimensionAuditFilenamePart\(project\(\)\?\.name\?\?project\(\)\?\.id\?\?"project","project"\)/);
  assert.match(fn,/dimensionAuditJsonFilename\(projectName\+"-dimension-audit-history-export-events-"\+snapshot\.event_count,snapshot\.generated_at\)/);
  assert.match(fn,/link\.download=filename/);
});
