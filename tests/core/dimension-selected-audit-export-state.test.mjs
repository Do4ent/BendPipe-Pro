import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 230: selected audit export buttons reflect selection availability",()=>{
  assert.match(ui,/data-copy-selected-dimension-audits '\+\(selectedIds\.length\?'':'disabled'\)\+'/);
  assert.match(ui,/Copy selected audit JSON \('\+selectedIds\.length\+'\)/);
  assert.match(ui,/data-download-selected-dimension-audits '\+\(selectedIds\.length\?'':'disabled'\)\+'/);
  assert.match(ui,/Download selected audit JSON \('\+selectedIds\.length\+'\)/);
});
