import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 605: audit history protocol validation and signature are exposed for QA",()=>{
  const validation=ui.match(/function dimensionAuditDownloadHistoryProtocolValidation\(protocol=dimensionAuditDownloadHistoryProtocol\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const signature=ui.match(/function dimensionAuditDownloadHistoryProtocolValidationSignature\(validation=dimensionAuditDownloadHistoryProtocolValidation\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(validation,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolValidation/);
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolValidationSignature/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolValidation:\(\)=>dimensionAuditDownloadHistoryProtocolValidation\(\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolValidationSignature:\(\)=>dimensionAuditDownloadHistoryProtocolValidationSignature\(\)/);
});
