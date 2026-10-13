import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 233: Saved Dimensions shows selection kind counts",()=>{
  assert.match(ui,/const selectionKindSummary=Object\.entries\(dimensionSelectionKindCounts\(\)\)/);
  assert.match(ui,/kind\+"\: "\+count/);
  assert.match(ui,/selectionKindSummary\?' · '\+esc\(selectionKindSummary\)/);
});
