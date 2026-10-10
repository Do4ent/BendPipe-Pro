import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 616: audit history protocol state validity is exposed for QA",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryProtocolStateValid\(state=dimensionAuditDownloadHistoryProtocolState\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryProtocolStateValid/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryProtocolStateValid:\(\)=>dimensionAuditDownloadHistoryProtocolStateValid\(\)/);
});
