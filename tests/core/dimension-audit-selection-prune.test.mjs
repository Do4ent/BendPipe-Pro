import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 223: Dimension selection can be pruned to current audit view",()=>{
  assert.match(ui,/function pruneDimensionSelectionToAuditView\(\)/);
  assert.match(ui,/allowed=new Set\(filteredDimensionManagerItems\(savedDimensions\(\)\)/);
  assert.match(ui,/if\(entry\?\.kind!=="dimension"\)return true/);
  assert.match(ui,/allowed\.has\(String\(entry\.dimensionId\)\)/);
  assert.match(ui,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
  assert.match(ui,/data-prune-dimension-selection/);
});
