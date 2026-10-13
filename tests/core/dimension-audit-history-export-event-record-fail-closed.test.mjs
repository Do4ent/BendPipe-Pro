import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 860: runtime records export events only after validation",()=>{
  const fn=ui.match(/function recordDimensionAuditDownloadHistoryExportEvent\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const validIndex=fn.indexOf("if(!dimensionAuditDownloadHistoryExportEventValid(event))");
  const pushIndex=fn.indexOf("dimensionAuditDownloadHistoryExportEventHistory.push(event)");
  assert.ok(validIndex>=0);
  assert.ok(pushIndex>validIndex);
  assert.match(fn,/throw new TypeError\("invalid history export event"\)/);
});
