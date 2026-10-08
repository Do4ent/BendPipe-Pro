import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 781: export payload binding is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportPayloadBinding\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportPayloadBinding/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportPayloadBindingValid\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportPayloadBindingSignature\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportPayloadBindingSignatureValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBinding:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportPayloadBindingValid:/);
});
