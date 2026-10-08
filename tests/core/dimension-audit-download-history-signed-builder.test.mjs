import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 563: history builder validates the signed snapshot",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const signed=\{/);
  assert.match(fn,/snapshot_signature:dimensionAuditDownloadAttemptHistoryAuditSignature\(base\)/);
  assert.match(fn,/const integrity=dimensionAuditDownloadAttemptHistoryIntegrity\(signed\)/);
  assert.match(fn,/valid:integrity\.valid/);
});
