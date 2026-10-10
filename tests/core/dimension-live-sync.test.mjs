import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 124: Properties refreshes immediately after Dimension changes",()=>{
  assert.match(props,/tubebender-dimension-change/);
  assert.match(props,/render\(true\)/);
});

test("question 124: Saved Dimensions refreshes while Measurements panel is open",()=>{
  assert.match(measurements,/tubebender-dimension-change/);
  assert.match(measurements,/panel\?\.classList\.contains\("open"\)\)render\(\)/);
});
