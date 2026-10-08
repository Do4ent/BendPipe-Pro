import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 444: Dimension Properties flags when review action is required",()=>{
  assert.match(properties,/const reviewActionRequired=reviewContextHealth==="pending"\|\|reviewContextHealth==="diagnostics-error"/);
  assert.match(properties,/action_required:canonicalReviewContext\?\.action_required\?\?reviewActionRequired/);
  assert.match(properties,/\["Review action required",reviewDisplay\.action_required\]/);
});
