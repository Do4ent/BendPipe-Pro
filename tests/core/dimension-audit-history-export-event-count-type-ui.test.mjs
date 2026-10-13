import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 903: UI history snapshot validator requires integer event_count",()=>{
  assert.match(ui,/Number\.isInteger\(value\.event_count\)&&value\.event_count===events\.length/);
});
