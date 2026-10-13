import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 936-937: UI protocol state requires valid central validation and canonical embedded fields",()=>{
  assert.match(ui,/&&value\.valid===true/);
  assert.match(ui,/&&validation\.valid===true/);
  assert.match(ui,/&&expectedValidation\.valid===true/);
  assert.match(ui,/!Array\.isArray\(validation\.errors\)/);
  assert.match(ui,/validation\.errors\.every\(code=>typeof code==="string"\)/);
});
