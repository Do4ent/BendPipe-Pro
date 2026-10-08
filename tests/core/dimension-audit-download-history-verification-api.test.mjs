import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 645: UI and history export use canonical verification",()=>{
  const verification=ui.match(/function dimensionAuditDownloadHistoryVerification\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(verification,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryVerification/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadiness/);
  assert.match(ui,/const verification=dimensionAuditDownloadHistoryVerification\(value\)/);
  assert.match(ui,/if\(!verification\.valid\)return \{ready:false,code:"VERIFICATION_FAILED"\}/);
  assert.match(ui,/data-history-verification-valid="'\+\(auditDownloadHistoryVerification\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-verification-code="'\+esc\(auditDownloadHistoryVerification\.code\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryVerification:/);
});
