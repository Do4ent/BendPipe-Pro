import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 590: UI audit history summary delegates to domain builder",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistorySummary\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistorySummary/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadHistorySummary\(dimensionAuditDownloadAttemptHistorySnapshot\(\)\)/);
});
