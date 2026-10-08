import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 613: audit history copy and download gate on protocol state",()=>{
  const gate=/if\(snapshot\.protocol_state\?\.valid!==true\)\{toast\("Audit download history protocol invalid"\);return false;\}/g;
  const matches=ui.match(gate)??[];
  assert.equal(matches.length,2);
});
