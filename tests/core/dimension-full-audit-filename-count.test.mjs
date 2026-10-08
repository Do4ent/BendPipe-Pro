import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
test("question 241: full project audit filename includes Dimension count",()=>{
  const fn=ui.match(/function downloadAllDimensionAudits\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const stem=name\+"-dimension-audit-"\+snapshot\.dimension_count/);
  assert.match(fn,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/);
});
