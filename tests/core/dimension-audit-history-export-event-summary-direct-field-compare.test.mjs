import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 917: summary validators compare canonical latest fields directly",()=>{
  for(const source of [domain,ui]){
    for(const field of ["latest_signature","latest_outcome","latest_action","latest_code"]){
      assert.match(source,new RegExp("value\\."+field+"===expected\\."+field));
    }
  }
});
