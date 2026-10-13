import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 852: measurements UI has no duplicate named function declarations",()=>{
  const names=[...ui.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(match=>match[1]);
  const counts=new Map();
  for(const name of names)counts.set(name,(counts.get(name)??0)+1);
  const duplicates=[...counts.entries()].filter(([,count])=>count>1);
  assert.deepEqual(duplicates,[]);
});
