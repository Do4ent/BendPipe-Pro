import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 372: review progress domain adapter validates selected IDs strictly",()=>{
  const fn=ui.match(/function domainDimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/if\(!Array\.isArray\(selectedIds\)\)throw new TypeError\("selected_ids must be an array"\)/);
  assert.match(fn,/selected_ids:selectedIds\.map\(id=>String\(id\)\)/);
});
