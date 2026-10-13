import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 160: Saved Dimensions filters by visibility state",()=>{
  assert.match(ui,/dimensionManagerFilter==="visible"/);
  assert.match(ui,/dimension\?\.visible!==false/);
  assert.match(ui,/dimensionManagerFilter==="hidden"/);
  assert.match(ui,/dimension\?\.visible===false/);
});

test("question 160: visibility filters are exposed with audit filters",()=>{
  assert.match(ui,/visible:'Visible'/);
  assert.match(ui,/hidden:'Hidden'/);
});
