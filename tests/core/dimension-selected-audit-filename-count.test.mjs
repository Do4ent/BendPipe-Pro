import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
test("question 239: selected Dimension audit filename includes selected count",()=>{
  const fn=ui.match(/function downloadSelectedDimensionAudits\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const stem=name\+"-dimension-selection-audit-"\+snapshot\.dimension_count/);
  assert.match(fn,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/);
});
