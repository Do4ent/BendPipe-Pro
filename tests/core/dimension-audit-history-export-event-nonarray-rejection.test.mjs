import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 883: UI export-event history snapshot rejects non-array input",()=>{
  assert.match(ui,/if\(!Array\.isArray\(events\)\)throw new TypeError\("history export events must be an array"\)/);
  assert.match(ui,/const list=events;/);
});
