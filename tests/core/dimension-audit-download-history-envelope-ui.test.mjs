import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 585: UI delegates audit history envelope integrity to domain",()=>{
  const signature=ui.match(/function dimensionAuditDownloadAttemptHistoryEnvelopeSignature\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const valid=ui.match(/function dimensionAuditDownloadAttemptHistoryEnvelopeValid\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryEnvelopeSignature/);
  assert.match(valid,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryEnvelopeValid/);
});
