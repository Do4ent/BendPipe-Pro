import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 854: UI fallback history signature binds signed export-event summary",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportEventHistorySignature\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/summary_signature:String\(value\.summary\?\.signature\?\?""\)/);
  assert.match(fn,/summary_latest_action:String\(value\.summary\?\.latest_action\?\?""\)/);
  assert.match(fn,/summary_latest_outcome:String\(value\.summary\?\.latest_outcome\?\?""\)/);
  assert.match(fn,/summary_latest_code:String\(value\.summary\?\.latest_code\?\?""\)/);
});
