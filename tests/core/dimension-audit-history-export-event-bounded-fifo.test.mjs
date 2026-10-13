import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 878: export-event runtime log is bounded FIFO keeping newest 20 events",()=>{
  assert.match(ui,/const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LIMIT=20/);
  const fn=ui.match(/function recordDimensionAuditDownloadHistoryExportEvent\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const push=fn.indexOf("dimensionAuditDownloadHistoryExportEventHistory.push(event)");
  const bound=fn.indexOf("dimensionAuditDownloadHistoryExportEventHistory.length>DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LIMIT");
  const shift=fn.indexOf("dimensionAuditDownloadHistoryExportEventHistory.shift()");
  assert.ok(push>=0);
  assert.ok(bound>push);
  assert.ok(shift>bound);
  assert.doesNotMatch(fn,/\.pop\(\)/);
});
