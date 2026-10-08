import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 721: readiness protocol descriptor and signature delegate to domain",()=>{
  const protocol=ui.match(/function dimensionAuditDownloadHistoryExportReadinessProtocol\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(protocol,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessProtocol/);
  assert.match(protocol,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessProtocol\(\)/);
  const signature=ui.match(/function dimensionAuditDownloadHistoryExportReadinessProtocolSignature\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessProtocolSignature/);
  assert.match(signature,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(value\)/);
});
