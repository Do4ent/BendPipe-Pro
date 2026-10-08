import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 534: last audit download attempt can be cleared",()=>{
  const fn=ui.match(/function clearDimensionAuditDownloadLastAttempt\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const hadValue=lastDimensionAuditDownloadAttempt!=null/);
  assert.match(fn,/lastDimensionAuditDownloadAttempt=null/);
  assert.match(fn,/return hadValue/);
});
