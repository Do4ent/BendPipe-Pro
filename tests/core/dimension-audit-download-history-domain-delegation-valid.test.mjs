import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 560: UI delegates audit download history integrity validation to domain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditValid\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryValid/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadHistoryValid\(snapshot\?\?\{\}\)/);
});
