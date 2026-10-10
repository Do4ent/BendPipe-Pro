import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 804: action-specific export permit is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionPermit\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportActionPermit/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionPermitValid\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionPermitSignature\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionPermitSignatureValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionPermit:/);
});
