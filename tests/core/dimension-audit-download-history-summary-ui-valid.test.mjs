import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 566: UI validates audit history summary against attempts",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistorySummaryValid\([\s\S]*?\n  \}/)?.[0]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistorySummaryValid/);
  assert.match(fn,/Number\(value\.blocked\?\?-1\)===counts\.blocked/);
  assert.match(fn,/Number\(value\.downloaded\?\?-1\)===counts\.downloaded/);
  assert.match(fn,/Number\(value\.failed\?\?-1\)===counts\.failed/);
  assert.match(fn,/attempts\.at\(-1\)\?\.signature/);
  const integrity=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(integrity,/const summaryValid=dimensionAuditDownloadAttemptHistorySummaryValid\(summary,attempts\)/);
});
