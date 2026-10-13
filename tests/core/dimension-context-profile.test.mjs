import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const context=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 120: Dimension has an explicit fail-closed context profile",()=>{
  assert.match(context,/dimension:\{title:"Dimension",edit:false,transform:false,visibility:false,properties:true,delete:false,isolate:false,transparent:false\}/);
});

test("question 120: mixed selections with Dimension cannot use generic visibility or delete",()=>{
  assert.match(context,/!\["end","dimension","section-derived"\]\.includes\(entry\.kind\)/);
});

test("question 120: blocked actions explain specialized Dimension commands",()=>{
  assert.match(context,/Размер редактируется специализированным Dimension editor/);
  assert.match(context,/Положение размерного представления изменяется Dimension grips/);
  assert.match(context,/Видимость размера управляется специализированными Dimension-командами/);
  assert.match(context,/Удаление размера должно выполняться специализированной Dimension-командой/);
});
