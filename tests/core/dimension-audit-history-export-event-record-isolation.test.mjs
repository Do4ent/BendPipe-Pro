import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 880: recorded export event is isolated from listeners and caller mutations",()=>{
  const fn=ui.match(/function recordDimensionAuditDownloadHistoryExportEvent\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventHistory\.push\(event\)/);
  assert.match(fn,/new CustomEvent\("tubebender-dimension-audit-history-export",\{detail:clone\(event\)\}\)/);
  assert.match(fn,/return clone\(event\)/);
  assert.doesNotMatch(fn,/detail:event\b/);
  assert.doesNotMatch(fn,/return event\s*;/);
});
