import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 183: Saved Dimensions shows exact focus state",()=>{
  assert.match(ui,/data-dimension-exact-focus/);
  assert.match(ui,/Exact focus: /);
  assert.match(ui,/data-dimension-focus-clear/);
});

test("question 183: exact focus can be cleared without changing project data",()=>{
  assert.match(ui,/dimensionManagerFocusId="";dimensionManagerSearch="";render\(\)/);
});
