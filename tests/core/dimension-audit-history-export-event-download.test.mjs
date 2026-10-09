import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 829: download history records upper-gate blocks and unified download outcome",()=>{
  const fn=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const recordBlocked=\(code\)=>recordDimensionAuditDownloadHistoryExportEvent\("download","blocked",code,snapshot\)/);
  const blocked=[...fn.matchAll(/recordBlocked\(blockCode\)/g)];
  assert.equal(blocked.length,11);
  assert.match(fn,/const result=downloadDimensionAuditJsonWithPermitEvidence\(/);
  assert.match(fn,/const attempt=dimensionAuditDownloadLastAttempt\(\)/);
  assert.match(fn,/const outcome=attempt\?\.status==="downloaded"\?"downloaded":attempt\?\.status==="failed"\?"failed":"blocked"/);
  assert.match(fn,/recordDimensionAuditDownloadHistoryExportEvent\("download",outcome,code,snapshot,permitEvidence,error\)/);
});
