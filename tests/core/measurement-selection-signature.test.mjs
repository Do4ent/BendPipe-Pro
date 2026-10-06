import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 126: measurement selection signature includes Dimension identity",()=>{
  assert.match(ui,/dimensionId:entry\.dimensionId\?\?null/);
});

test("question 126: measurement selection signature includes Section-derived identity",()=>{
  assert.match(ui,/derivedId:entry\.derivedId\?\?null/);
});

test("question 126: reference and container identities are not collapsed",()=>{
  assert.match(ui,/sceneId:entry\.sceneId\?\?null/);
  assert.match(ui,/nodeId:entry\.nodeId\?\?null/);
  assert.match(ui,/instanceId:entry\.instanceId\?\?null/);
  assert.match(ui,/groupId:entry\.groupId\?\?null/);
});
