import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 159: Dimension audit summary counts visible and hidden dimensions",()=>{
  assert.match(ui,/visible:0,hidden:0/);
  assert.match(ui,/if\(dimension\?\.visible===false\)summary\.hidden\+\+;else summary\.visible\+\+/);
});

test("question 159: Saved Dimensions displays visibility counts",()=>{
  assert.match(ui,/Visible: '\+auditSummary\.visible/);
  assert.match(ui,/Hidden: '\+auditSummary\.hidden/);
});
