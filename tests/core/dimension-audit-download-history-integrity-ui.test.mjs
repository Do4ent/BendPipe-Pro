import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 576: UI exposes audit history integrity diagnostics with domain delegation",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryIntegrity/);
  assert.match(fn,/INVALID_HISTORY_SCHEMA/);
  assert.match(fn,/INVALID_ATTEMPTS/);
  assert.match(fn,/INVALID_SUMMARY/);
  assert.match(fn,/INVALID_SNAPSHOT_SIGNATURE/);
  const snapshot=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(snapshot,/const integrity=dimensionAuditDownloadAttemptHistoryIntegrity\(signed\)/);
  assert.match(snapshot,/integrity,/);
  assert.match(snapshot,/valid:integrity\.valid/);
});
