import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
test("question 442: Dimension Properties shows local review completion percent",()=>{
  assert.match(properties,/const dimensionReviewCompletePercent=reviewReasons\.length/);
  assert.match(properties,/Math\.round\(completedReviewReasons\.length\/reviewReasons\.length\*100\):100/);
  assert.match(properties,/complete_percent:canonicalReviewContext\?\.complete_percent\?\?dimensionReviewCompletePercent/);
  assert.match(properties,/\["Dimension review complete %",reviewDisplay\.complete_percent\]/);
});
