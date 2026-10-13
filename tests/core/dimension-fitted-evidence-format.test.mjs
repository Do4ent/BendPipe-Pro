import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 188: reference-level Fitted evidence uses stable audit formatting",()=>{
  assert.match(ui,/auditNumber\(error\?\.mm\)/);
  assert.match(ui,/auditNumber\(error\?\.deg\)/);
  assert.match(ui,/auditNumber\(ref\?\.confidence\)/);
});
