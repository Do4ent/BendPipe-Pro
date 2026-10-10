import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 138: Saved Dimensions manager shows stale provenance summary",()=>{
  assert.match(ui,/const rebindCount=Array\.isArray\(dimension\.rebound_history\)\?dimension\.rebound_history\.length:0/);
  assert.match(ui,/Reason: /);
  assert.match(ui,/Source: /);
  assert.match(ui,/Rebound · audit /);
  assert.match(ui,/data-dim-provenance=/);
});
