import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 854: UI fallback history signature binds signed export-event summary",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportEventHistorySignature\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/summary_signature:summary\.signature/);
  assert.match(fn,/summary_latest_action:summary\.latest_action/);
  assert.match(fn,/summary_latest_outcome:summary\.latest_outcome/);
  assert.match(fn,/summary_latest_code:summary\.latest_code/);
  assert.doesNotMatch(fn,/summary_signature:String\(/);
});

test("question 1173: UI history signature fallback requires canonical signed summary fields",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportEventHistorySignature\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/typeof summary\.signature!=="string"/);
  assert.match(fn,/typeof summary\.latest_action!=="string"/);
  assert.match(fn,/typeof summary\.latest_outcome!=="string"/);
  assert.match(fn,/typeof summary\.latest_code!=="string"/);
});
