import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 954-955: UI readiness protocol requires canonical types",()=>{
  assert.match(ui,/typeof value\.schema==="string"&&value\.schema===expected\.schema/);
  assert.match(ui,/value\.codes\.every\(\(code,index\)=>typeof code==="string"&&code===expected\.codes\[index\]\)/);
  assert.match(ui,/if\(typeof signature!=="string"\|\|signature\.length===0\)return false;/);
});
