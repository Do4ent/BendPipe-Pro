import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 540: audit download attempt history summary is deterministically signed",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistorySummarySignature\(summary=dimensionAuditDownloadAttemptHistorySummary\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/return JSON\.stringify\(\{/);
  assert.match(fn,/latest_signature:String\(value\.latest_signature\?\?""\)/);
  assert.doesNotMatch(fn,/generated_at|Date\(/);
});
