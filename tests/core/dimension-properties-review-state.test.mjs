import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
test("question 437: Dimension Properties shows aggregate review state",()=>{
  assert.match(properties,/const dimensionReviewState=reviewReasons\.length===0\?"not-required":pendingReviewReasons\.length===0\?"complete":"pending"/);
  assert.match(properties,/state:canonicalReviewContext\?\.state\?\?dimensionReviewState/);
  assert.match(properties,/\["Dimension review state",reviewDisplay\.state\]/);
});
