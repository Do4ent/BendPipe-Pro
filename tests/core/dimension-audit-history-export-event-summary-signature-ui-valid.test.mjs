import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 865: UI fallback validates signed export-event summary",()=>{
  const start=ui.indexOf("function dimensionAuditDownloadHistoryExportEventSummaryValid(");
  const end=ui.indexOf("\n  function dimensionAuditDownloadHistoryExportEventHistorySignature(",start);
  assert.ok(start>=0&&end>start);
  const fn=ui.slice(start,end);
  assert.match(fn,/const expected=dimensionAuditDownloadHistoryExportEventSummary\(list\)/);
  assert.match(fn,/typeof value\.latest_code==="string"/);
  assert.match(fn,/value\.latest_code===expected\.latest_code/);
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventSummarySignatureValid\(value\.signature,value\)/);
});
