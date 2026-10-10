import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 552: audit download history snapshot has deterministic signature",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSignature\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/return JSON\.stringify\(\{/);
  assert.match(fn,/summary_signature:value\.summary_signature/);
  assert.match(fn,/attempt_signatures:value\.attempts\.map\(attempt=>attempt\.signature\)/);
  assert.match(fn,/generated_at:value\.generated_at\?\?""/);
  assert.match(fn,/typeof value\.summary_signature!=="string"/);
  assert.doesNotMatch(fn,/summary_signature:String\(/);
  assert.doesNotMatch(fn,/attempt_signatures:.*String\(/);
  assert.doesNotMatch(fn,/Date\(/);
});

test("question 1174: history audit signature fallback uses canonical fields without coercion",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSignature\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/Number\.isInteger\(value\.attempt_count\)/);
  assert.doesNotMatch(fn,/attempt_count:Number\(/);
});
