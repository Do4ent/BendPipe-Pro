import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 150: Saved Dimensions can sort by project order or audit priority",()=>{
  assert.match(ui,/dimensionManagerSort="project"/);
  assert.match(ui,/dimensionManagerSort!=="audit"/);
  assert.match(ui,/data-dimension-sort="project"/);
  assert.match(ui,/data-dimension-sort="audit"/);
});

test("question 150: audit priority sorts Stale then Rebound then remaining items",()=>{
  assert.match(ui,/String\(dimension\?\.status\?\?""\)==="Stale"\?0:dimension\?\.rebound_from_stale===true\?1:2/);
  assert.match(ui,/rank\(a\.dimension\)-rank\(b\.dimension\)\|\|a\.index-b\.index/);
});
