import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 483: Dimension audit filename limits use one immutable policy",()=>{
  assert.match(ui,/const DIMENSION_AUDIT_FILENAME_POLICY=Object\.freeze\(\{/);
  assert.match(ui,/part_default_length:80/);
  assert.match(ui,/part_min_length:8/);
  assert.match(ui,/part_max_length:120/);
  assert.match(ui,/json_default_length:220/);
  assert.match(ui,/json_min_length:80/);
  assert.match(ui,/json_max_length:240/);
  assert.match(ui,/value\.length<=DIMENSION_AUDIT_FILENAME_POLICY\.json_max_length/);
  assert.match(ui,/maxLength=DIMENSION_AUDIT_FILENAME_POLICY\.part_default_length/);
  assert.match(ui,/maxLength=DIMENSION_AUDIT_FILENAME_POLICY\.json_default_length/);
});
