import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 647: audit history verification signature is exposed for QA",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryVerificationSignature\(verification=dimensionAuditDownloadHistoryVerification\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryVerificationSignature/);
  assert.match(ui,/data-history-verification-signature="'\+esc\(auditDownloadHistoryVerificationSignature\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryVerificationSignature:/);
});
