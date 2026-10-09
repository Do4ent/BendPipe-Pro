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
  assert.match(fn,/Number\.isInteger\(value\.blocked\)&&value\.blocked===counts\.blocked/);
  assert.match(fn,/Number\.isInteger\(value\.downloaded\)&&value\.downloaded===counts\.downloaded/);
  assert.match(fn,/Number\.isInteger\(value\.failed\)&&value\.failed===counts\.failed/);
  assert.match(fn,/typeof attempt\.status==="string"/);
  assert.match(fn,/typeof attempt\.signature==="string"/);
  assert.match(fn,/attempts\.length\?attempts\.at\(-1\)\.signature:""/);
  const integrity=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(integrity,/const summaryValid=attemptsArrayValid&&dimensionAuditDownloadAttemptHistorySummaryValid\(summary,attempts\)/);
});
