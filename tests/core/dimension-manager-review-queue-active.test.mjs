import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 248: Review queue preset exposes active state and avoids redundant rerender",()=>{
  assert.match(ui,/Review queue \('\+auditSummary\.needs_review\+'\)'\+\(dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&!dimensionManagerSearch\?' · Active':''\)/);
  assert.match(ui,/auditSummary\.needs_review===0\|\|dimensionManagerFilter==="needs-review"&&dimensionManagerSort==="audit"&&!dimensionManagerSearch\?'disabled':''/);
});
