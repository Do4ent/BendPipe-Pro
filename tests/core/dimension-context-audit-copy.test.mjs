import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 200: Dimension context menu can copy audit JSON",()=>{
  assert.match(ui,/data-object-action="dimension-audit-copy"/);
  assert.match(ui,/Copy Dimension audit JSON/);
  assert.match(ui,/copyDimensionRebindAudit\?\.\(entry\.dimensionId\)/);
  assert.match(ui,/entries\.length===1&&entries\[0\]\?\.kind==="dimension"/);
});
