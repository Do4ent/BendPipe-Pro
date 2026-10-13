import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 735: history export gate signature is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGateSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGateSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGateSignatureValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGateSignatureValid/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSignature:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSignatureValid:/);
});
