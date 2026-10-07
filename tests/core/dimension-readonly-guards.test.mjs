import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 207: Dimension runtime enforces read-only guards centrally",()=>{
  assert.match(runtime,/const readonly=\(\)=>\{try\{return eng\(\)\?\.readonly\?\.\(\)===true/);
  assert.match(runtime,/function commit\(id,label,mutator\)\{\n    if\(readonly\(\)\)/);
  assert.match(runtime,/function setDimensionVisible\(id,visible\)\{\n    if\(readonly\(\)\)/);
  assert.match(runtime,/function deleteDimension\(id\)\{\n    if\(readonly\(\)\)/);
  assert.match(runtime,/function beginDrag\(event,picked\)\{\n    if\(readonly\(\)\)/);
});

test("question 207: inline Dimension editor is inspection-only in read-only projects",()=>{
  assert.match(runtime,/const stale=staleDimension\(dimension\),locked=readonly\(\)/);
  assert.match(runtime,/status\.textContent="Read-only · "/);
  assert.match(runtime,/apply\.disabled=true/);
  assert.match(runtime,/Проект открыт только для просмотра/);
});
