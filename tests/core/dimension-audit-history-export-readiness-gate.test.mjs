import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 690: history copy and download share one export readiness gate",()=>{
  const readiness=ui.match(/function dimensionAuditDownloadHistoryExportReadiness\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(readiness,/code:"VERIFICATION_FAILED"/);
  const copy=ui.match(/async function copyDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const download=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(copy,/const readiness=dimensionAuditDownloadHistoryExportReadiness\(snapshot\)/);
  assert.match(download,/const readiness=dimensionAuditDownloadHistoryExportReadiness\(snapshot\)/);
  assert.doesNotMatch(copy,/dimensionAuditDownloadHistoryTrust\(snapshot\)/);
  assert.doesNotMatch(download,/dimensionAuditDownloadHistoryTrust\(snapshot\)/);
});
