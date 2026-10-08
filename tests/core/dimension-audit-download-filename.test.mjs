import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 219: Dimension audit download filenames include generated timestamp",()=>{
  assert.match(ui,/function dimensionAuditFilenameStamp\(value=new Date\(\)\)/);
  assert.match(ui,/value\.toISOString\(\)\.replace\(\/\[:\.\]\/g,"-"\)/);
  assert.match(ui,/function dimensionAuditJsonFilename\(stem,generatedAt,maxLength=220\)/);
  assert.match(ui,/const stamp=dimensionAuditFilenameStamp\(new Date\(generatedAt\)\)/);
  assert.match(ui,/downloadDimensionAuditJson\(dimensionAuditJsonFilename\(stem,snapshot\.generated_at\),snapshot\)/);
});

test("question 219: individual Dimension audit download also uses generated_at timestamp",()=>{
  const fn=ui.match(/function downloadDimensionRebindAudit\(dimensionId\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const stem=projectName\+"-"\+dimensionName\+"-dimension-audit"/);
  assert.match(fn,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/);
});
