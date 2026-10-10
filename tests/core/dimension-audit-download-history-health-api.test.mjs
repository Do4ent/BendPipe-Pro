import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 631: aggregate audit history health is exposed for QA",()=>{
  const health=ui.match(/function dimensionAuditDownloadHistoryHealth\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const signature=ui.match(/function dimensionAuditDownloadHistoryHealthSignature\(health=dimensionAuditDownloadHistoryHealth\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(health,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryHealth/);
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryHealthSignature/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryHealth:\(\)=>dimensionAuditDownloadHistoryHealth\(dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryHealthSignature:/);
});
