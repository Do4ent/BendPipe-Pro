import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 761: canonical history export authorization is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportAuthorization\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportAuthorization/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportAuthorizationValid\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportAuthorizationSignature\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportAuthorizationSignatureValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorization:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationValid:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationSignature:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationSignatureValid:/);
});
