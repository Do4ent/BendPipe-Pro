import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 342: Measurements UI loads review progress domain module",()=>{
  assert.match(ui,/const REVIEW_PROGRESS_URL="__TB_REVIEW_PROGRESS_MODULE_URL__"/);
  assert.match(ui,/reviewProgressDomain=null/);
  assert.match(ui,/\[geometry,dimensions,reviewProgressDomain\]=await Promise\.all\(\[/);
  assert.match(ui,/import\(REVIEW_PROGRESS_URL\)\.catch/);
});
