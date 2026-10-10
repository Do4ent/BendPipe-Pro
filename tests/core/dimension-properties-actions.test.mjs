import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const grips=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const props=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 122: Dimension visibility uses a specialized history command",()=>{
  assert.match(grips,/function setDimensionVisible\(id,visible\)/);
  assert.match(grips,/visible\?"Показать Dimension":"Скрыть Dimension"/);
  assert.match(grips,/show-dimension/);
  assert.match(grips,/hide-dimension/);
});

test("question 122: Properties exposes specialized Dimension visibility and delete actions",()=>{
  assert.match(props,/Dimension actions/);
  assert.match(props,/data-dimension-visibility/);
  assert.match(props,/data-dimension-delete/);
  assert.match(props,/TubeBenderDimensionGrips\?\.setDimensionVisible/);
  assert.match(props,/TubeBenderDimensionGrips\?\.deleteDimension/);
});
