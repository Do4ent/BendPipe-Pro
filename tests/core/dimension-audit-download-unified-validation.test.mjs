import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 492: Dimension audit download API uses unified validation result",()=>{
  const fn=ui.match(/function downloadDimensionAuditJson\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const validation=dimensionAuditDownloadValidation\(filename,snapshot\)/);
  assert.match(fn,/const safeFilename=validation\.filename/);
  assert.match(fn,/validation\.code==="INVALID_FILENAME"/);
  assert.match(fn,/validation\.code==="INVALID_SNAPSHOT"/);
  assert.match(fn,/validation\.code==="UNSUPPORTED_SCHEMA"/);
});
