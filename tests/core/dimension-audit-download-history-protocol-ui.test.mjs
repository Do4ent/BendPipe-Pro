import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 602: audit history protocol snapshot and signature are exposed for QA",()=>{
  const protocol=ui.match(/function dimensionAuditDownloadHistoryProtocol\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const signature=ui.match(/function dimensionAuditDownloadHistoryProtocolSignature\(protocol=dimensionAuditDownloadHistoryProtocol\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(protocol,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocol/);
  assert.match(signature,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolSignature/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocol:\(\)=>dimensionAuditDownloadHistoryProtocol\(\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolSignature:\(\)=>dimensionAuditDownloadHistoryProtocolSignature\(\)/);
});
