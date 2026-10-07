import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 221: filtered Dimension audit distinguishes selected ids inside and outside current view",()=>{
  assert.match(ui,/const viewIds=new Set\(items\.map\(dimension=>String\(dimension\?\.id\?\?""\)\)\)/);
  assert.match(ui,/const selectedInView=selectionIds\.filter\(id=>viewIds\.has\(String\(id\)\)\)/);
  assert.match(ui,/const selectedOutsideView=selectionIds\.filter\(id=>!viewIds\.has\(String\(id\)\)\)/);
  assert.match(ui,/selected_in_view_ids:selectedInView/);
  assert.match(ui,/selected_outside_view_ids:selectedOutsideView/);
});
