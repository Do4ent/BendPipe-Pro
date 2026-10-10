import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 782: manager exposes canonical export payload binding state",()=>{
  assert.match(ui,/const auditDownloadHistoryExportPayloadBinding=dimensionAuditDownloadHistoryExportPayloadBinding\(auditDownloadHistorySnapshot,auditDownloadHistoryExportChainSnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryExportPayloadBindingValid=dimensionAuditDownloadHistoryExportPayloadBindingValid\(/);
  assert.match(ui,/data-history-export-payload-binding-schema="'\+esc\(auditDownloadHistoryExportPayloadBinding\.schema\)\+'"/);
  assert.match(ui,/data-history-export-payload-binding-code="'\+esc\(auditDownloadHistoryExportPayloadBinding\.code\)\+'"/);
  assert.match(ui,/data-history-export-payload-binding-valid="'\+\(auditDownloadHistoryExportPayloadBindingValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-payload-binding-signature-valid="'\+\(auditDownloadHistoryExportPayloadBindingSignatureValid\?'1':'0'\)\+'"/);
});
