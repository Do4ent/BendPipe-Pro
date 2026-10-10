import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 235: visible Dimension audit selection can be inverted",()=>{
  assert.match(ui,/function invertVisibleDimensionAuditSelection\(\)/);
  assert.match(ui,/filter\(dimension=>dimension\?\.visible!==false\)/);
  assert.match(ui,/selectedIds=new Set/);
  assert.match(ui,/return entry\?\.kind!=="dimension"\|\|!ids\.has\(String\(entry\.dimensionId\)\)/);
  assert.match(ui,/\.filter\(id=>!selectedIds\.has\(id\)\)/);
  assert.match(ui,/data-invert-visible-dimension-audit/);
});
