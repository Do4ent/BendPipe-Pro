import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 559: UI delegates audit download history signatures to domain",()=>{
  const summary=ui.match(/function dimensionAuditDownloadAttemptHistorySummarySignature\(summary=dimensionAuditDownloadAttemptHistorySummary\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const audit=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSignature\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(summary,/auditDownloadDomain\?\.dimensionAuditDownloadHistorySummarySignature/);
  assert.match(summary,/return auditDownloadDomain\.dimensionAuditDownloadHistorySummarySignature\(summary\?\?\{\}\)/);
  assert.match(audit,/auditDownloadDomain\?\.dimensionAuditDownloadHistorySignature/);
  assert.match(audit,/return auditDownloadDomain\.dimensionAuditDownloadHistorySignature\(snapshot\?\?\{\}\)/);
});
