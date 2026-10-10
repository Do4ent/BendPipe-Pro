import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 485: Dimension audit download API rejects invalid snapshots",()=>{
  const fn=ui.match(/function downloadDimensionAuditJson\(filename,snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/validation\.code==="INVALID_SNAPSHOT"/);
  assert.match(fn,/toast\("Некорректный Dimension audit snapshot"\)/);
  assert.match(fn,/return false/);
});
