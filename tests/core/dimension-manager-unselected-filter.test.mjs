import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 227: Saved Dimensions can filter by unselected state",()=>{
  assert.match(ui,/dimensionManagerFilter==="unselected"/);
  assert.match(ui,/!selectedIds\.has\(String\(dimension\?\.id\?\?""\)\)/);
  assert.match(ui,/unselected:'Unselected'/);
});
