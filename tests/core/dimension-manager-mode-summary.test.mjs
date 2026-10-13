import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 149: Saved Dimensions audit summary shows mode counts",()=>{
  assert.match(ui,/const modeSummary=Object\.entries\(auditSummary\.by_mode\)/);
  assert.match(ui,/mode\+'\: '\+count/);
  assert.match(ui,/modeSummary\?' · '\+esc\(modeSummary\)/);
});
