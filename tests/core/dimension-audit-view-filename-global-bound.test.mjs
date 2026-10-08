import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 477: Dimension audit view filename is globally bounded and keeps timestamp/json suffix",()=>{
  assert.match(ui,/function dimensionAuditJsonFilename\(stem,generatedAt,maxLength=220\)/);
  assert.match(ui,/const limit=Math\.max\(80,Math\.min\(240,Math\.trunc\(Number\(maxLength\)\|\|220\)\)\)/);
  assert.match(ui,/const suffix="-"\+stamp\+"\.json"/);
  assert.match(ui,/const budget=Math\.max\(16,limit-suffix\.length\)/);
  assert.match(ui,/return safeStem\+suffix/);
  assert.match(ui,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/);
});
