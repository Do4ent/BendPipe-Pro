import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 205: Dimension context header shows audit geometry class and review state",()=>{
  assert.match(ui,/dimensionAuditGeometryClass\?\.\(dimension\)/);
  assert.match(ui,/dimensionAuditNeedsReview\?\.\(dimension\)===true/);
  assert.match(ui,/⚠ Needs review/);
});
