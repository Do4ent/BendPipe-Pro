import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
test("question 441: Dimension Properties shows aggregate review context health",()=>{
  assert.match(properties,/const reviewContextHealth=dimensionReviewState==="not-required"/);
  assert.match(properties,/"diagnostics-error"/);
  assert.match(properties,/:dimensionReviewState==="complete"\?"ready":"pending"/);
  assert.match(properties,/health:canonicalReviewContext\?\.health\?\?reviewContextHealth/);
  assert.match(properties,/\["Review context health",reviewDisplay\.health\]/);
});
