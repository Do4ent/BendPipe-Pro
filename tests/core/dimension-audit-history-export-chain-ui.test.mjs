import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 771: canonical history export chain is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportChain\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportChain/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportChainValid\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportChainSignature\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportChainSignatureValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChain:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainValid:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSignature:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSignatureValid:/);
});
