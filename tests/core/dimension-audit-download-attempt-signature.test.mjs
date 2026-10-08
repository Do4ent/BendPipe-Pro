import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 532: audit download attempt signature is deterministic",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptSignature\(attempt\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/return JSON\.stringify\(\{/);
  assert.match(fn,/preflight_signature:String\(value\.preflight_signature\?\?""\)/);
  assert.match(fn,/runtime_signature:String\(value\.runtime_signature\?\?""\)/);
  assert.match(fn,/protocol_signature:String\(value\.protocol_signature\?\?""\)/);
  assert.doesNotMatch(fn,/generated_at|Date\(/);
});
