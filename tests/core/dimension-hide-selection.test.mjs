import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 133: hiding active Dimension clears its active grip state",()=>{
  assert.match(runtime,/if\(visible!==true\)/);
  assert.match(runtime,/if\(String\(activeId\)===String\(id\)\)activeId=null/);
});

test("question 133: hiding Dimension removes only that Dimension from Object Context selection",()=>{
  assert.match(runtime,/entry\?\.kind!=="dimension"\|\|String\(entry\.dimensionId\)!==String\(id\)/);
  assert.match(runtime,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
});
