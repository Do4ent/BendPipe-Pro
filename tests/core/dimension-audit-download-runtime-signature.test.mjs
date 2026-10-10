import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 514: audit download runtime state has deterministic signature",()=>{
  const fn=ui.match(/function dimensionAuditDownloadRuntimeSignature\(state=dimensionAuditDownloadRuntimeState\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/return JSON\.stringify\(\{/);
  assert.match(fn,/protocol_state_schema:String\(value\.protocol_state_schema\?\?""\)/);
  assert.doesNotMatch(fn,/generated_at|Date\(/);
});
