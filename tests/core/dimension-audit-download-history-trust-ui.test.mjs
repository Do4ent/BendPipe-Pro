import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 666: final history trust state is exposed in manager and QA API",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryTrust\(snapshot=\{\}\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryTrustSignature\(trust=dimensionAuditDownloadHistoryTrust\(\)\)/);
  assert.match(ui,/data-history-trusted="'\+\(auditDownloadHistoryTrust\.trusted\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-trust-code="'\+esc\(auditDownloadHistoryTrust\.code\)\+'"/);
  assert.match(ui,/data-history-trust-signature="'\+esc\(auditDownloadHistoryTrustSignature\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryTrust:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryTrustSignature:/);
});
