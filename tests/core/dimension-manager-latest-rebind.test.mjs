import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 141: Saved Dimensions manager summarizes latest Rebind audit",()=>{
  assert.match(ui,/const latestRebind=rebindCount\?dimension\.rebound_history\[rebindCount-1\]:null/);
  assert.match(ui,/Previous source: /);
  assert.match(ui,/Previous reason: /);
  assert.match(ui,/Previous value: /);
});
