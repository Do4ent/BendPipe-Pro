import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 362: UI review progress signature delegates to domain model",()=>{
  const fn=ui.match(/function dimensionReviewProgressSignature\(progress\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/reviewProgressDomain\?\.reviewProgressSignature/);
  assert.match(fn,/return reviewProgressDomain\.reviewProgressSignature\(progress\?\?\{\}\)/);
});
