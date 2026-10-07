import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 373: review progress helpers validate item arrays strictly",()=>{
  const local=ui.match(/function dimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const domain=ui.match(/function domainDimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(local,/if\(!Array\.isArray\(items\)\)throw new TypeError\("review progress items must be an array"\)/);
  assert.match(domain,/if\(!Array\.isArray\(items\)\)throw new TypeError\("review progress items must be an array"\)/);
});
