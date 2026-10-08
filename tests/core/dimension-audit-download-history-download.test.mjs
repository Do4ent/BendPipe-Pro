import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 550: audit download history can be downloaded through unified validator",()=>{
  const fn=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)/);
  assert.match(fn,/dimension-audit-download-history-/);
  assert.match(fn,/downloadDimensionAuditJson\(dimensionAuditJsonFilename\(stem,snapshot\.generated_at\),snapshot\)/);
});
