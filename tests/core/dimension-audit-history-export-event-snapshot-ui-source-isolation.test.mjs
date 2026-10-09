import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 891: UI fallback snapshot clones and freezes source event objects",()=>{
  assert.match(ui,/const normalized=Object\.freeze\(clone\(list\)\.map\(event=>Object\.freeze\(\{\.\.\.event\}\)\)\)/);
});
