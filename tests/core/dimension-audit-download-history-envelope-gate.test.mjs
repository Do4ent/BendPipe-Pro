import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 587: copy and download require valid audit history envelope",()=>{
  const copy=ui.match(/async function copyDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const download=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(copy,/const health=dimensionAuditDownloadHistoryHealth\(snapshot\)/);
  assert.match(copy,/if\(!health\.valid\)/);
  assert.match(download,/const health=dimensionAuditDownloadHistoryHealth\(snapshot\)/);
  assert.match(download,/if\(!health\.valid\)/);
});
