import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 620: UI centralizes audit history protocol binding validation",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryProtocolBindingValid\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolBindingValid/);
  const verification=ui.match(/function dimensionAuditDownloadHistoryVerification\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(verification,/const bindingValid=dimensionAuditDownloadHistoryProtocolBindingValid\(value\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolBindingValid:\(\)=>dimensionAuditDownloadHistoryProtocolBindingValid\(dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)/);
});
