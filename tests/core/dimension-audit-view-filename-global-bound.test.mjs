import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 477: Dimension audit view filename is globally bounded and keeps timestamp/json suffix",()=>{
  const fn=ui.match(/function dimensionAuditJsonFilename\(stem,generatedAt,maxLength=DIMENSION_AUDIT_FILENAME_POLICY\.json_default_length\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/DIMENSION_AUDIT_FILENAME_POLICY\.json_min_length/);
  assert.match(fn,/DIMENSION_AUDIT_FILENAME_POLICY\.json_max_length/);
  assert.match(fn,/const suffix="-"\+stamp\+"\.json"/);
  assert.match(fn,/const budget=Math\.max\(16,limit-suffix\.length\)/);
  assert.match(fn,/return safeStem\+suffix/);
  assert.match(ui,/dimensionAuditJsonFilename\(stem,snapshot\.generated_at\)/);
});
