import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 201: Dimension context menu opens specialized editor",()=>{
  assert.match(ui,/data-object-action="dimension-edit"/);
  assert.match(ui,/Edit Dimension…/);
  assert.match(ui,/dimensionGripsApi\(\)\?\.openEditor\?\.\(entry\.dimensionId/);
  assert.match(ui,/entries\.length===1&&entries\[0\]\?\.kind==="dimension"/);
});
