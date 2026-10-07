import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 236: Saved Dimensions rows expose selected state",()=>{
  assert.match(ui,/const selectedIdSet=new Set\(selectedIds\)/);
  assert.match(ui,/const selected=selectedIdSet\.has\(String\(dimension\?\.id\?\?""\)\)/);
  assert.match(ui,/data-dim-selected=/);
  assert.match(ui,/✓ Selected · /);
});
