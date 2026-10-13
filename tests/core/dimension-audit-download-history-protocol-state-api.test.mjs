import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 608: audit history protocol state and signature are exposed for QA",()=>{
  const state=ui.match(/function dimensionAuditDownloadHistoryProtocolState\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const signature=ui.match(/function dimensionAuditDownloadHistoryProtocolStateSignature\(state=dimensionAuditDownloadHistoryProtocolState\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(state,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolState/);
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolStateSignature/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolState:\(\)=>dimensionAuditDownloadHistoryProtocolState\(\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolStateSignature:\(\)=>dimensionAuditDownloadHistoryProtocolStateSignature\(\)/);
});
