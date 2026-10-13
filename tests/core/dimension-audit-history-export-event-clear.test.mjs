import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 837: clearing export event history is isolated and refreshes manager state",()=>{
  const clearFn=ui.match(/function clearDimensionAuditDownloadHistoryExportEventHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(clearFn,/const count=dimensionAuditDownloadHistoryExportEventHistory\.length/);
  assert.match(clearFn,/dimensionAuditDownloadHistoryExportEventHistory\.splice\(0,count\)/);
  assert.match(clearFn,/return count/);
  assert.doesNotMatch(clearFn,/dimensionAuditDownloadAttemptHistory/);
  assert.doesNotMatch(clearFn,/clearDimensionAuditDownloadLastAttempt/);

  const handler=ui.match(/body\.querySelector\("\[data-clear-dimension-audit-history-export-events\]"\)\?\.addEventListener\("click",\(\)=>\{([\s\S]*?)\n    \}\);/)?.[1]??"";
  assert.match(handler,/clearDimensionAuditDownloadHistoryExportEventHistory\(\)/);
  assert.match(handler,/render\(\)/);
  assert.doesNotMatch(handler,/clearDimensionAuditDownloadAttemptHistory\(\)/);
});
