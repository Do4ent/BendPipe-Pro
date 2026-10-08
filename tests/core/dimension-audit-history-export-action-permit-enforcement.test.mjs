import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 806: copy and download enforce their own signed action permits",()=>{
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionPermit\("copy",exportActionStatusSnapshot/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionPermit\("download",exportActionStatusSnapshot/);
  const validMatches=[...ui.matchAll(/const exportActionPermitValid=dimensionAuditDownloadHistoryExportActionPermitValid\(/g)];
  assert.equal(validMatches.length,2);
  const signatureMatches=[...ui.matchAll(/const exportActionPermitSignatureValid=dimensionAuditDownloadHistoryExportActionPermitSignatureValid\(/g)];
  assert.equal(signatureMatches.length,2);
  assert.match(ui,/if\(!exportActionPermitValid\|\|!exportActionPermitSignatureValid\|\|!exportActionPermit\.ready\)/);
  assert.match(ui,/INVALID_EXPORT_ACTION_PERMIT_SIGNATURE/);
});
