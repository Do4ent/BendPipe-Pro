import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 368: review progress domain load is optional and falls back safely",()=>{
  assert.match(ui,/import\(REVIEW_PROGRESS_URL\)\.catch\(error=>\{console\.warn\("Review progress domain failed to load; using UI fallback",error\);return null;\}\)/);
  assert.match(ui,/catch\(error\)\{console\.error\("Measurements UI failed to load",error\);return;\}/);
});
