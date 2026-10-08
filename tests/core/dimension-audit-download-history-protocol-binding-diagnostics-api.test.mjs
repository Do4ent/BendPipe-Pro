import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 625: audit history protocol binding diagnostics are exposed for QA",()=>{
  const binding=ui.match(/function dimensionAuditDownloadHistoryProtocolBinding\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const signature=ui.match(/function dimensionAuditDownloadHistoryProtocolBindingSignature\(binding=dimensionAuditDownloadHistoryProtocolBinding\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(binding,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolBinding/);
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolBindingSignature/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolBinding:\(\)=>dimensionAuditDownloadHistoryProtocolBinding\(dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolBindingSignature:/);
});
