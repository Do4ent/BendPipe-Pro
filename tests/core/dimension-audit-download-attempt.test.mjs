import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 529: audit download attempts are tracked with protocol metadata",()=>{
  assert.match(ui,/let lastDimensionAuditDownloadAttempt=null/);
  const fn=ui.match(/function recordDimensionAuditDownloadAttempt\(status,preflight,error=null\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionAuditDownloadAttempt\.v1"/);
  assert.match(fn,/preflight_signature:String\(preflight\?\.signature\?\?""\)/);
  assert.match(fn,/runtime_signature:String\(preflight\?\.runtime_validation\?\.runtime_signature\?\?""\)/);
  assert.match(fn,/protocol_signature:String\(preflight\?\.runtime_validation\?\.protocol_signature\?\?""\)/);
  assert.match(fn,/new CustomEvent\("tubebender-dimension-audit-download"/);
});
