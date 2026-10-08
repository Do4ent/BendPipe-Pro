import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 586: audit history snapshot is envelope-signed and envelope-validated",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/envelope_signature:dimensionAuditDownloadAttemptHistoryEnvelopeSignature\(full\)/);
  assert.match(fn,/envelope_valid:dimensionAuditDownloadAttemptHistoryEnvelopeValid\(enveloped\)/);
});
