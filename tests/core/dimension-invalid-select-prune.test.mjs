import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 213: rejected Dimension selection prunes invalid global key",()=>{
  assert.match(runtime,/if\(!dimension\|\|dimension\.visible===false\)/);
  assert.match(runtime,/selectionKeys\?\.\(\)\?\?\[\]/);
  assert.match(runtime,/entry\?\.kind!=="dimension"\|\|String\(entry\.dimensionId\)!==String\(id\?\?""\)/);
  assert.match(runtime,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
});
