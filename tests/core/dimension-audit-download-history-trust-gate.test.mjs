import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 676: copy and download history fail closed on final trust",()=>{
  const copy=ui.match(/async function copyDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const download=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(copy,/const trust=dimensionAuditDownloadHistoryTrust\(snapshot\)/);
  assert.match(copy,/if\(!trust\.trusted\)\{toast\("Audit download history trust failed: "\+trust\.code\);return false;\}/);
  assert.match(download,/const trust=dimensionAuditDownloadHistoryTrust\(snapshot\)/);
  assert.match(download,/if\(!trust\.trusted\)\{toast\("Audit download history trust failed: "\+trust\.code\);return false;\}/);
});
