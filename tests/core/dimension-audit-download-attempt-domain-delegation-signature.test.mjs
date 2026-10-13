import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 571: audit download attempt signature delegates to domain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptSignature\(attempt\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const value=attempt\?\?\{\}/);
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadAttemptSignature/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadAttemptSignature\(value\)/);
});

test("question 1182: signature delegation reuses the same canonicalized input boundary",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptSignature\(attempt\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.doesNotMatch(fn,/dimensionAuditDownloadAttemptSignature\(attempt\?\?\{\}\)/);
});
