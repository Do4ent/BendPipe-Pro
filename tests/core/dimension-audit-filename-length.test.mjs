import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 243: audit filename parts are length-bounded",()=>{
  assert.match(ui,/maxLength=80/);
  assert.match(ui,/const limit=Math\.max\(8,Math\.min\(120,Math\.trunc\(Number\(maxLength\)\|\|80\)\)\)/);
  assert.match(ui,/const clipped=safe\.slice\(0,limit\)/);
  assert.match(ui,/return clipped\|\|String\(fallback\)\.slice\(0,limit\)/);
});
