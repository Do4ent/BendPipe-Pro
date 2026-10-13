import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 121: specialized Dimension delete uses model history",()=>{
  assert.match(runtime,/function deleteDimension\(id\)/);
  assert.match(runtime,/modelCommand/);
  assert.match(runtime,/Удалить Dimension/);
  assert.match(runtime,/p\.engineering_dimensions=next\.map\(clone\)/);
});

test("question 121: delete clears Dimension selection and dispatches a dedicated reason",()=>{
  assert.match(runtime,/parseSelectionKey\?\.\(key\)\?\.kind!=="dimension"/);
  assert.match(runtime,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
  assert.match(runtime,/delete-dimension/);
});

test("question 121: active Dimension supports Delete and Backspace",()=>{
  assert.match(runtime,/event\.key==="Delete"\|\|event\.key==="Backspace"/);
  assert.match(runtime,/deleteDimension\(activeId\)/);
  assert.match(runtime,/Object\.freeze\(\{rebuild,selectDimension,deleteDimension/);
});
