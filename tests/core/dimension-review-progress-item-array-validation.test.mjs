import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 373: review progress helpers validate item arrays strictly",()=>{
  const normalized=ui.match(/function dimensionReviewProgressItems\(items=savedDimensions\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(normalized,/if\(!Array\.isArray\(items\)\)throw new TypeError\("review progress items must be an array"\)/);
  assert.match(ui,/const reviewItems=dimensionReviewProgressItems\(items\)/);
});
