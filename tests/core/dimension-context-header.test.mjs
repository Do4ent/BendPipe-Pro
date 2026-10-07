import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 204: Dimension context header shows identity mode and status",()=>{
  assert.match(ui,/entries\.length===1&&entries\[0\]\?\.kind==="dimension"/);
  assert.match(ui,/Dimension · /);
  assert.match(ui,/dimension\?\.note\?\?dimension\?\.id/);
  assert.match(ui,/dimension\?\.mode\?\?"Unknown"/);
  assert.match(ui,/dimension\?\.status\?\?"Unknown"/);
});
