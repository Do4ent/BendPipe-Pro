import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 192: Dimension audit snapshot persists reference provenance counts",()=>{
  assert.match(ui,/reference_geometry_counts:clone\(dimensionReferenceStatusCounts\(dimension\)\)/);
});
