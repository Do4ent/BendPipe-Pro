import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 564: history summary latest signature comes from the history tail",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistorySummary\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/latest_signature:String\(dimensionAuditDownloadAttemptHistory\.at\(-1\)\?\.signature\?\?""\)/);
  assert.doesNotMatch(fn,/lastDimensionAuditDownloadAttempt/);
});
