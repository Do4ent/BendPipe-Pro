import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 130: missing Dimension entries are detected after History restore",()=>{
  assert.match(runtime,/if\(entry\?\.kind!=="dimension"\)return false/);
  assert.match(runtime,/return !dimension\|\|dimension\.visible===false/);
});

test("question 130: stale Dimension selection keys are removed from Object Context",()=>{
  assert.match(runtime,/if\(entry\?\.kind!=="dimension"\)return true/);
  assert.match(runtime,/return !!dimension&&dimension\.visible!==false/);
  assert.match(runtime,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
});

test("question 130: active Dimension is cleared when its object no longer exists",()=>{
  assert.match(runtime,/if\(activeId&&!dimensionById\(activeId\)\)activeId=null/);
});
