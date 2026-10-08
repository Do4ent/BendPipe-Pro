import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 555: audit download history export fails closed on invalid integrity",()=>{
  const copy=ui.match(/async function copyDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const download=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(copy,/if\(!health\.valid\)\{toast\("Audit download history health invalid: "\+health\.code\);return false;\}/);
  assert.match(download,/if\(!health\.valid\)\{toast\("Audit download history health invalid: "\+health\.code\);return false;\}/);
});
