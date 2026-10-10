import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 933-935: UI protocol validation guards scalar and code-list types",()=>{
  assert.match(ui,/const scalarValid=\(field,expectedValue\)=>typeof field==="string"&&field===expectedValue/);
  assert.match(ui,/Array\.isArray\(value\.integrity_codes\)/);
  assert.match(ui,/value\.integrity_codes\.every\(code=>typeof code==="string"\)/);
  assert.match(ui,/Array\.isArray\(value\.validation_codes\)/);
  assert.match(ui,/value\.validation_codes\.every\(code=>typeof code==="string"\)/);
});
