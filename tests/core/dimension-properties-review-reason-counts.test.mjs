import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 443: Dimension Properties shows local review reason counts",()=>{
  assert.match(properties,/\["Dimension review reason count",reviewReasons\.length\]/);
  assert.match(properties,/\["Dimension completed reason count",completedReviewReasons\.length\]/);
  assert.match(properties,/\["Dimension pending reason count",pendingReviewReasons\.length\]/);
});
