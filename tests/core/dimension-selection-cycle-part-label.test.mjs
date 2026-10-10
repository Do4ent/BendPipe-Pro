import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 197: Dimension selection-cycle label includes picked part",()=>{
  assert.match(ui,/const part=String\(candidate\?\.dimensionPart\?\?"dimension"\)/);
  assert.match(ui,/part==="text"\?"Text":part==="line"\?"Line":part==="reference"\?"Reference":part/);
  assert.match(ui,/Dimension · /);
  assert.match(ui,/partLabel/);
});
