import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 904: UI export-event summary validator requires integer counters",()=>{
  for(const field of ["total","blocked","copied","downloaded","failed","copy","download","valid","invalid"]){
    assert.match(ui,new RegExp("Number\\.isInteger\\(value\\."+field+"\\)&&value\\."+field+"===expected\\."+field));
  }
});
