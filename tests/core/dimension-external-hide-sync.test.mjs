import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 135: globally synchronized Dimension selection rejects hidden objects",()=>{
  assert.match(runtime,/return !dimension\|\|dimension\.visible===false/);
  assert.match(runtime,/return !!dimension&&dimension\.visible!==false/);
});

test("question 135: active Dimension requires visible selected object",()=>{
  assert.match(runtime,/selectedDimension&&selectedDimension\.visible!==false/);
});

test("question 135: external Dimension changes resynchronize active selection",()=>{
  assert.match(runtime,/tubebender-dimension-change",\(\)=>\{syncActiveDimensionFromSelection\(\);rebuild\(\);\}/);
});
