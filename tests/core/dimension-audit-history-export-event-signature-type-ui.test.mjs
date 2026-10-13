import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 913-914: UI signature validators fail closed on non-string or empty signature",()=>{
  const matches=[...ui.matchAll(/if\(typeof signature!==\"string\"\|\|signature\.length===0\)return false;/g)];
  assert.equal(matches.length>=2,true);
});
