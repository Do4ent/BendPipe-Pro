import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 581: audit history snapshot and manager expose integrity signature",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/integrity_signature:dimensionAuditDownloadAttemptHistoryIntegritySignature\(integrity\)/);
  assert.match(ui,/data-integrity-signature="'\+esc\(auditDownloadHistorySnapshot\.integrity_signature\?\?'\'\)\+'"/);
});
