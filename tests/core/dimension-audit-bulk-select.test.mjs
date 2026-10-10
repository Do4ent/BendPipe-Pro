import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 155: current audit results can be selected in bulk",()=>{
  assert.match(ui,/function selectVisibleDimensionAuditResults\(\)/);
  assert.match(ui,/filteredDimensionManagerItems\(savedDimensions\(\)\)\.filter\(dimension=>dimension\?\.visible!==false\)/);
  assert.match(ui,/"dimension:"\+encodeURIComponent\(String\(dimension\.id\)\)/);
  assert.match(ui,/replaceSelectionKeys\?\.\(keys,\{announce:true\}\)/);
  assert.match(ui,/data-select-visible-dimension-audit/);
});
