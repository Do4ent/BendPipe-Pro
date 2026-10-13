import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 861: clearing export-event history broadcasts runtime state change",()=>{
  const clearFn=ui.match(/function clearDimensionAuditDownloadHistoryExportEventHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(clearFn,/tubebender-dimension-audit-history-export-clear/);
  assert.match(clearFn,/cleared_count:count/);
  assert.match(ui,/window\.addEventListener\("tubebender-dimension-audit-history-export-clear",\(\)=>\{if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}\);/);
});
