import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 857: named functions do not call themselves from default parameters",()=>{
  const findings=[];
  const re=/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*(?:\)[^{]*)?)\)\s*\{/g;
  for(const match of ui.matchAll(re)){
    const name=match[1];
    const params=match[2];
    const escaped=name.replace(/[$]/g,"\\$&");
    if(new RegExp("=\\s*"+escaped+"\\s*\\(").test(params)){
      findings.push({name,params});
    }
  }
  assert.deepEqual(findings,[]);
});
