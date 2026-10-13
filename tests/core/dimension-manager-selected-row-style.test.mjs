import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 237: selected Dimension rows have dedicated visual styling",()=>{
  assert.match(ui,/\.tb-measure-result\[data-dim-selected="1"\]/);
  assert.match(ui,/box-shadow:inset 3px 0 0/);
  assert.match(ui,/background:rgba\(/);
});
