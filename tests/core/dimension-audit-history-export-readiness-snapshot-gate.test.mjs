import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 696: history copy and download gate on versioned readiness snapshot",()=>{
  const copy=ui.match(/async function copyDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const download=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(copy,/const exportState=dimensionAuditDownloadHistoryExportReadinessSnapshot\(snapshot\)/);
  assert.match(copy,/const exportGate=dimensionAuditDownloadHistoryExportGate\(exportState,snapshot\)/);
  assert.match(copy,/const exportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot\(exportAuthorization\)/);
  assert.match(download,/const exportState=dimensionAuditDownloadHistoryExportReadinessSnapshot\(snapshot\)/);
  assert.match(download,/const exportGate=dimensionAuditDownloadHistoryExportGate\(exportState,snapshot\)/);
  assert.match(download,/const exportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot\(exportAuthorization\)/);
});
