import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 572: audit download attempt validity delegates to domain and gates history",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptValid\(attempt\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadAttemptValid/);
  assert.match(fn,/signature===dimensionAuditDownloadAttemptSignature\(value\)/);
  const integrity=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(integrity,/const attemptsValid=attemptsArrayValid&&attempts\.every\(attempt=>dimensionAuditDownloadAttemptValid\(attempt\)\)/);
});
