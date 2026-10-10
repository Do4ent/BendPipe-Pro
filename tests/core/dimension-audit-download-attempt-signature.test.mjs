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
  assert.match(fn,/preflight_signature:value\.preflight_signature/);
  assert.match(fn,/runtime_signature:value\.runtime_signature/);
  assert.match(fn,/protocol_signature:value\.protocol_signature/);
  assert.match(fn,/generated_at:value\.generated_at/);
  assert.match(fn,/typeof value\.generated_at!=="string"/);
  assert.doesNotMatch(fn,/preflight_signature:String\(/);
  assert.doesNotMatch(fn,/runtime_signature:String\(/);
  assert.doesNotMatch(fn,/protocol_signature:String\(/);
  assert.doesNotMatch(fn,/generated_at:String\(/);
  assert.doesNotMatch(fn,/Date\(/);
});

test("question 1187: attempt signature fallback serializes only canonical validated fields",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptSignature\(attempt\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/typeof value\.preflight_signature!=="string"/);
  assert.match(fn,/typeof value\.runtime_signature!=="string"/);
  assert.match(fn,/typeof value\.protocol_signature!=="string"/);
});
