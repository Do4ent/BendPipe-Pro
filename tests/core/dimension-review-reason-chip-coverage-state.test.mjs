import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 276: review reason chips classify selection coverage",()=>{
  assert.match(ui,/const selectionCoverage=selectedCount===0\?"none":selectedCount===count\?"complete":"partial"/);
  assert.match(ui,/data-selection-coverage="'\+selectionCoverage\+'"/);
  assert.match(ui,/selectedPercent\+'% · '\+selectionCoverage\+'\)/);
});
