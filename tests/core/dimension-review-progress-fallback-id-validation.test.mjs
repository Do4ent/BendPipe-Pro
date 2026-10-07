import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 370: review progress UI fallback validates item IDs fail-closed",()=>{
  const fn=ui.match(/function dimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/if\(!id\)throw new TypeError\("review progress item "\+index\+" id must be non-empty"\)/);
  assert.match(fn,/if\(reviewIds\.has\(id\)\)throw new RangeError\("duplicate review progress item id: "\+id\)/);
});
