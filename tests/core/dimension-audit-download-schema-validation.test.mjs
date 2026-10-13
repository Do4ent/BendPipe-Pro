import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 486: Dimension audit download API validates snapshot schema",()=>{
  const validation=ui.match(/function dimensionAuditDownloadValidation\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const download=ui.match(/function downloadDimensionAuditJson\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(validation,/const schema=String\(snapshot\?\.schema\?\?""\)\.trim\(\)/);
  assert.match(validation,/code:"UNSUPPORTED_SCHEMA"/);
  assert.match(download,/validation\.code==="UNSUPPORTED_SCHEMA"/);
  assert.match(download,/toast\("Неподдерживаемая schema Dimension audit snapshot"\)/);
});
