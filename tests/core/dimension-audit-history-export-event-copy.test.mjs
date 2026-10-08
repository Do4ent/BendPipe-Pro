import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 828: copy history records blocked, copied and failed export events",()=>{
  const fn=ui.match(/async function copyDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const recordBlocked=\(code\)=>recordDimensionAuditDownloadHistoryExportEvent\("copy","blocked",code,snapshot\)/);
  const blocked=[...fn.matchAll(/recordBlocked\(blockCode\)/g)];
  assert.equal(blocked.length,10);
  assert.match(fn,/recordDimensionAuditDownloadHistoryExportEvent\("copy","copied","READY",snapshot,\{/);
  assert.match(fn,/action_permit_signature:exportActionPermitSignature/);
  assert.match(fn,/action_permit_snapshot_signature:exportActionPermitSnapshot\.snapshot_signature/);
  assert.match(fn,/recordDimensionAuditDownloadHistoryExportEvent\("copy","failed","COPY_FAILED",snapshot,/);
});
