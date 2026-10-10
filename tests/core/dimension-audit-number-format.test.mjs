import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 187: Fitted audit numbers use stable three-decimal formatting",()=>{
  assert.match(ui,/function auditNumber\(value,decimals=3\)/);
  assert.match(ui,/n\.toFixed\(decimals\)/);
  assert.match(ui,/auditNumber\(fittedStats\.max_error_mm\)/);
  assert.match(ui,/auditNumber\(fittedStats\.max_error_deg\)/);
  assert.match(ui,/auditNumber\(fittedStats\.min_confidence\)/);
});
