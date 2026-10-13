import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");

test("question 117: Stale dimensions keep representation grips but hide associative reference grips",()=>{
  assert.match(runtime,/const staleDimension=d=>String\(d\?\.status\?\?""\)==="Stale"/);
  assert.match(runtime,/if\(!staleDimension\(dimension\)\)\{/);
  assert.match(runtime,/dimensionGrip==="reference"/);
});

test("question 117: dragging a stale associative reference fails closed",()=>{
  assert.match(runtime,/if\(staleDimension\(dimension\)&&data\.dimensionGrip==="reference"\)/);
  assert.match(runtime,/Stale Dimension: reference можно изменить только через явный Rebind/);
});

test("question 117: inline engineering edits are disabled until explicit Rebind",()=>{
  assert.match(runtime,/mode\.disabled=true;input\.disabled=true/);
  assert.match(runtime,/status\.textContent="Stale · "/);
  assert.match(runtime,/apply\.disabled=true/);
  assert.match(runtime,/Используйте явный Rebind в панели Измерения/);
});
