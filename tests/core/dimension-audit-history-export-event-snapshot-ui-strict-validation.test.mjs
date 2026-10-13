import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 858: UI fallback snapshot validation keeps canonical time and chronology invariants",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportEventHistorySnapshotValid\(snapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/date\.toISOString\(\)!==text/);
  assert.match(fn,/const times=events\.map\(event=>new Date\(String\(event\?\.generated_at\?\?""\)\)\.getTime\(\)\)/);
  assert.match(fn,/times\[index\]<times\[index-1\]/);
  assert.match(fn,/time>date\.getTime\(\)/);
});
