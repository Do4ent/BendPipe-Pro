import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 249: active Review queue exposes one-click exit to default view",()=>{
  assert.match(ui,/data-dimension-review-queue-exit/);
  assert.match(ui,/Exit review queue/);
  assert.match(ui,/dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch="";dimensionManagerFocusId="";render\(\)/);
});
