import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 702: UI delegates history readiness signature validation to domain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessSignatureValid\(signature=dimensionAuditDownloadHistoryExportReadinessSignature\(\),readiness=dimensionAuditDownloadHistoryExportReadiness\(\),snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessStateSignatureValid/);
  assert.match(fn,/return auditDownloadDomain\.dimensionAuditDownloadHistoryExportReadinessStateSignatureValid\(signature,readiness\)/);
});
