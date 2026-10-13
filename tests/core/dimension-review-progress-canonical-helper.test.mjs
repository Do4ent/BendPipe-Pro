import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 351: canonical review progress source selection is centralized",()=>{
  assert.match(ui,/function canonicalDimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/source:"domain"/);
  assert.match(ui,/source:"ui-fallback"/);
  assert.match(ui,/snapshot:reviewProgressDomain\.reviewProgressSnapshot\(domain\)/);
  assert.match(ui,/signature:reviewProgressDomain\.reviewProgressSignature\(domain\)/);
});
