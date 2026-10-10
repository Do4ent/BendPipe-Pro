import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 921-922: UI audit-attempt validator uses canonical types and UTC ISO time",()=>{
  assert.match(ui,/typeof value\.status!=="string"/);
  assert.match(ui,/typeof value\.generated_at!=="string"/);
  assert.match(ui,/timestamp\.toISOString\(\)===value\.generated_at/);
  assert.match(ui,/signature\.length>0/);
});
