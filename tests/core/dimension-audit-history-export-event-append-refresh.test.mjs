import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 862: manager refreshes when a history export event is appended",()=>{
  assert.match(ui,/window\.addEventListener\("tubebender-dimension-audit-history-export",\(\)=>\{if\(panel\?\.classList\.contains\("open"\)\)render\(\);\}\);/);
  assert.match(ui,/window\.dispatchEvent\(new CustomEvent\("tubebender-dimension-audit-history-export",\{detail:clone\(event\)\}\)\)/);
});
