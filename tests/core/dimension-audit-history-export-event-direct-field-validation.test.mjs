import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 916: event validators use already-validated canonical string fields directly",()=>{
  for(const source of [domain,ui]){
    assert.match(source,/value\.history_snapshot_signature\.length>0/);
    assert.match(source,/value\.signature\.length>0/);
    assert.doesNotMatch(source,/!!String\(value\.history_snapshot_signature/);
    assert.doesNotMatch(source,/!!String\(value\.signature/);
  }
});
