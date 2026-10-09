import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 859: single export-event UI validator has no snapshot-scope dependency",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportEventValid\(event=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/date\.toISOString\(\)===text/);
  assert.doesNotMatch(fn,/events\.map\(/);
  assert.doesNotMatch(fn,/times\[/);
  assert.match(fn,/typeof value\.history_snapshot_signature==="string"/);
  assert.match(fn,/value\.history_snapshot_signature\.length>0/);
  assert.match(fn,/codeOutcomeValid/);
});
