import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 271: review reason chips show selected counts",()=>{
  assert.match(ui,/const reviewReasonSelectedIds=new Set\(selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const selectedCount=items\.filter\(dimension=>/);
  assert.match(ui,/dimensionAuditReviewReasons\(dimension\)\.includes\(reason\)/);
  assert.match(ui,/selected '\+selectedCount/);
});
