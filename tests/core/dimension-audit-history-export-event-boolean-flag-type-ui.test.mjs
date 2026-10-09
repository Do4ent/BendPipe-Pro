import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 906: UI history snapshot validator requires literal true integrity flags",()=>{
  assert.match(ui,/value\.events_valid===true/);
  assert.match(ui,/value\.summary_valid===true/);
  assert.match(ui,/value\.summary_signature_valid===true/);
  assert.match(ui,/value\.signature_valid===true/);
});
