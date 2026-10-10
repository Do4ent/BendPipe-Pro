import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 182: focused Saved Dimension uses exact id matching",()=>{
  assert.match(ui,/dimensionManagerFocusId=""/);
  assert.match(ui,/dimensionManagerFocusId=id/);
  assert.match(ui,/String\(dimension\?\.id\?\?""\)===dimensionManagerFocusId/);
  assert.match(ui,/return exact\?\[exact\]:\[\]/);
});

test("question 182: manual filter search and reset leave exact-focus mode",()=>{
  assert.match(ui,/dimensionManagerFocusId="";dimensionManagerFilter=/);
  assert.match(ui,/dimensionManagerFocusId="";dimensionManagerSearch=/);
  assert.match(ui,/dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch="";dimensionManagerFocusId=""/);
});
