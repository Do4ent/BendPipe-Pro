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
  assert.match(ui,/const protocolStateValid=dimensionAuditDownloadHistoryProtocolBindingValid\(value\)/);
  const gate=/if\(!dimensionAuditDownloadHistoryProtocolBindingValid\(snapshot\)\)\{toast\("Audit download history protocol invalid"\);return false;\}/g;
  assert.equal((ui.match(gate)??[]).length,2);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolBindingValid:\(\)=>dimensionAuditDownloadHistoryProtocolBindingValid\(dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)/);
});
