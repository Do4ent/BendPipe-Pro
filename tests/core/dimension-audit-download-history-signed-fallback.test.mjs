import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 562: UI fallback validates signed audit download history",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const signature=String\(value\.snapshot_signature\?\?""\)/);
  assert.match(fn,/const snapshotSignatureValid=!signature\|\|signature===dimensionAuditDownloadAttemptHistoryAuditSignature\(value\)/);
});
