import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 580: UI audit history integrity signature delegates to domain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegritySignature\(integrity\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryIntegritySignature/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadHistoryIntegritySignature\(integrity\?\?\{\}\)/);
});
