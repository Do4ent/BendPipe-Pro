import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 927-929: UI history integrity mirrors strict domain rules",()=>{
  assert.match(ui,/const attemptsArrayValid=Array\.isArray\(value\.attempts\)/);
  assert.match(ui,/Number\.isInteger\(value\.attempt_count\)/);
  assert.match(ui,/typeof value\.summary_signature==="string"/);
  assert.match(ui,/typeof value\.protocol_state_signature==="string"/);
  assert.match(ui,/date\.toISOString\(\)===value\.generated_at/);
});
