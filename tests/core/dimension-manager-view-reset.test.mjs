import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 153: Saved Dimensions audit view can reset in one action",()=>{
  assert.match(ui,/data-dimension-view-reset/);
  assert.match(ui,/dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch="";render\(\)/);
  assert.match(ui,/Reset view/);
});
