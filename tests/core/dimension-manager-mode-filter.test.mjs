import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 148: Saved Dimensions filters by Reference or Driving mode",()=>{
  assert.match(ui,/dimensionManagerFilter==="reference"/);
  assert.match(ui,/String\(dimension\?\.mode\?\?""\)==="Reference"/);
  assert.match(ui,/dimensionManagerFilter==="driving"/);
  assert.match(ui,/String\(dimension\?\.mode\?\?""\)==="Driving"/);
});

test("question 148: mode filters are exposed with audit filters",()=>{
  assert.match(ui,/reference:'Reference'/);
  assert.match(ui,/driving:'Driving'/);
});
